import { Router, type IRouter } from "express";
import { and, asc, desc, eq, gte, lte, sql } from "drizzle-orm";
import {
  db,
  contestsTable,
  contestProblemsTable,
  problemsTable,
  submissionsTable,
  usersTable,
} from "@workspace/db";
import {
  ListContestsResponse,
  CreateContestBody,
  CreateContestResponse,
  GetContestParams,
  GetContestResponse,
  GetContestLeaderboardParams,
  GetContestLeaderboardResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

function slugify(title: string): string {
  return (
    title
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "")
      .slice(0, 64) || "contest"
  );
}

async function generateUniqueSlug(title: string): Promise<string> {
  const base = slugify(title);
  let slug = base;
  let suffix = 1;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const [existing] = await db.select({ id: contestsTable.id }).from(contestsTable).where(eq(contestsTable.slug, slug));
    if (!existing) return slug;
    suffix += 1;
    slug = `${base}-${suffix}`;
  }
}

router.get("/contests", async (_req, res): Promise<void> => {
  const contests = await db.select().from(contestsTable).orderBy(desc(contestsTable.startTime));

  const counts = await db
    .select({ contestId: contestProblemsTable.contestId, count: sql<number>`count(*)`.mapWith(Number) })
    .from(contestProblemsTable)
    .groupBy(contestProblemsTable.contestId);
  const countMap = new Map(counts.map((c) => [c.contestId, c.count]));

  res.json(
    ListContestsResponse.parse(
      contests.map((c) => ({ ...c, problemCount: countMap.get(c.id) ?? 0 })),
    ),
  );
});

router.post("/contests", async (req, res): Promise<void> => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }

  const parsed = CreateContestBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const slug = await generateUniqueSlug(parsed.data.title);

  const [contest] = await db
    .insert(contestsTable)
    .values({
      title: parsed.data.title,
      description: parsed.data.description,
      startTime: parsed.data.startTime,
      endTime: parsed.data.endTime,
      createdById: req.user.id,
      slug,
    })
    .returning();

  if (!contest) {
    res.status(500).json({ error: "Failed to create contest" });
    return;
  }

  const problemIds = parsed.data.problems.map((p) => p.problemId);
  const problemRows = problemIds.length > 0 ? await db.select().from(problemsTable) : [];
  const problemById = new Map(problemRows.map((p) => [p.id, p]));

  const linkedProblems =
    parsed.data.problems.length > 0
      ? await db
          .insert(contestProblemsTable)
          .values(
            parsed.data.problems.map((p) => ({
              contestId: contest.id,
              problemId: p.problemId,
              points: p.points,
              label: p.label,
            })),
          )
          .returning()
      : [];

  res.status(201).json(
    CreateContestResponse.parse({
      ...contest,
      problems: linkedProblems.map((lp) => ({
        problemId: lp.problemId,
        title: problemById.get(lp.problemId)?.title ?? "",
        difficulty: problemById.get(lp.problemId)?.difficulty ?? "easy",
        points: lp.points,
        label: lp.label,
      })),
    }),
  );
});

router.get("/contests/:id", async (req, res): Promise<void> => {
  const params = GetContestParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [contest] = await db.select().from(contestsTable).where(eq(contestsTable.id, params.data.id));
  if (!contest) {
    res.status(404).json({ error: "Contest not found" });
    return;
  }

  const linkedProblems = await db
    .select({
      problemId: contestProblemsTable.problemId,
      points: contestProblemsTable.points,
      label: contestProblemsTable.label,
      title: problemsTable.title,
      difficulty: problemsTable.difficulty,
    })
    .from(contestProblemsTable)
    .innerJoin(problemsTable, eq(contestProblemsTable.problemId, problemsTable.id))
    .where(eq(contestProblemsTable.contestId, contest.id))
    .orderBy(asc(contestProblemsTable.label));

  res.json(GetContestResponse.parse({ ...contest, problems: linkedProblems }));
});

router.get("/contests/:id/leaderboard", async (req, res): Promise<void> => {
  const params = GetContestLeaderboardParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [contest] = await db.select().from(contestsTable).where(eq(contestsTable.id, params.data.id));
  if (!contest) {
    res.status(404).json({ error: "Contest not found" });
    return;
  }

  const submissions = await db
    .select()
    .from(submissionsTable)
    .where(and(eq(submissionsTable.contestId, contest.id), gte(submissionsTable.submittedAt, contest.startTime)))
    .orderBy(asc(submissionsTable.submittedAt));

  type Standing = {
    userId: string;
    totalScore: number;
    solvedCount: number;
    penaltyMinutes: number;
    lastAcceptedAt: Date | null;
    bestScoreByProblem: Map<number, number>;
  };

  const standings = new Map<string, Standing>();

  for (const sub of submissions) {
    let standing = standings.get(sub.userId);
    if (!standing) {
      standing = {
        userId: sub.userId,
        totalScore: 0,
        solvedCount: 0,
        penaltyMinutes: 0,
        lastAcceptedAt: null,
        bestScoreByProblem: new Map(),
      };
      standings.set(sub.userId, standing);
    }

    const previousBest = standing.bestScoreByProblem.get(sub.problemId) ?? 0;
    if (sub.score > previousBest) {
      standing.totalScore += sub.score - previousBest;
      standing.bestScoreByProblem.set(sub.problemId, sub.score);
    }

    if (sub.status === "accepted") {
      if (previousBest < sub.maxScore) {
        standing.solvedCount += 1;
      }
      standing.penaltyMinutes += Math.max(
        0,
        Math.round((sub.submittedAt.getTime() - contest.startTime.getTime()) / 60000),
      );
      if (!standing.lastAcceptedAt || sub.submittedAt > standing.lastAcceptedAt) {
        standing.lastAcceptedAt = sub.submittedAt;
      }
    }
  }

  const users = standings.size > 0 ? await db.select().from(usersTable) : [];
  const userById = new Map(users.map((u) => [u.id, u]));

  const ranked = Array.from(standings.values()).sort((a, b) => {
    if (b.totalScore !== a.totalScore) return b.totalScore - a.totalScore;
    if (a.penaltyMinutes !== b.penaltyMinutes) return a.penaltyMinutes - b.penaltyMinutes;
    return 0;
  });

  const leaderboard = ranked.map((s, index) => {
    const user = userById.get(s.userId);
    const displayName =
      [user?.firstName, user?.lastName].filter(Boolean).join(" ").trim() || user?.email || "Unknown";
    return {
      rank: index + 1,
      userId: s.userId,
      username: displayName,
      profileImageUrl: user?.profileImageUrl ?? null,
      totalScore: s.totalScore,
      solvedCount: s.solvedCount,
      penaltyMinutes: s.penaltyMinutes,
      lastAcceptedAt: s.lastAcceptedAt,
    };
  });

  res.json(GetContestLeaderboardResponse.parse(leaderboard));
});

export default router;
