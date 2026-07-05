import { Router, type IRouter } from "express";
import { and, countDistinct, desc, eq } from "drizzle-orm";
import { db, submissionsTable, problemsTable, languagesTable } from "@workspace/db";
import { GetDashboardSummaryResponse } from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/dashboard", async (req, res): Promise<void> => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }

  const allSubmissions = await db
    .select({
      id: submissionsTable.id,
      problemId: submissionsTable.problemId,
      status: submissionsTable.status,
    })
    .from(submissionsTable)
    .where(eq(submissionsTable.userId, req.user.id));

  const totalSubmissions = allSubmissions.length;
  const acceptedProblemIds = new Set(
    allSubmissions.filter((s) => s.status === "accepted").map((s) => s.problemId),
  );
  const solvedCount = acceptedProblemIds.size;
  const acceptanceRate =
    totalSubmissions === 0
      ? 0
      : allSubmissions.filter((s) => s.status === "accepted").length / totalSubmissions;

  const recentSubmissions = await db
    .select({
      id: submissionsTable.id,
      problemId: submissionsTable.problemId,
      problemTitle: problemsTable.title,
      contestId: submissionsTable.contestId,
      languageId: submissionsTable.languageId,
      languageName: languagesTable.name,
      status: submissionsTable.status,
      score: submissionsTable.score,
      maxScore: submissionsTable.maxScore,
      submittedAt: submissionsTable.submittedAt,
    })
    .from(submissionsTable)
    .innerJoin(problemsTable, eq(submissionsTable.problemId, problemsTable.id))
    .innerJoin(languagesTable, eq(submissionsTable.languageId, languagesTable.id))
    .where(eq(submissionsTable.userId, req.user.id))
    .orderBy(desc(submissionsTable.submittedAt))
    .limit(10);

  res.json(
    GetDashboardSummaryResponse.parse({
      solvedCount,
      totalSubmissions,
      acceptanceRate,
      recentSubmissions,
    }),
  );
});

export default router;
