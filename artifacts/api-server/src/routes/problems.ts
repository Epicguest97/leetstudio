import { Router, type IRouter } from "express";
import { and, countDistinct, eq } from "drizzle-orm";
import { db, problemsTable, testCasesTable, submissionsTable } from "@workspace/db";
import {
  ListProblemsQueryParams,
  ListProblemsResponse,
  CreateProblemBody,
  CreateProblemResponse,
  GetProblemParams,
  GetProblemResponse,
  UpdateProblemParams,
  UpdateProblemBody,
  UpdateProblemResponse,
  DeleteProblemParams,
  ListProblemTestCasesParams,
  ListProblemTestCasesResponse,
  CreateTestCaseParams,
  CreateTestCaseBody,
  CreateTestCaseResponse,
  DeleteTestCaseParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

function slugify(title: string): string {
  return (
    title
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "")
      .slice(0, 64) || "problem"
  );
}

async function generateUniqueSlug(title: string): Promise<string> {
  const base = slugify(title);
  let slug = base;
  let suffix = 1;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const [existing] = await db
      .select({ id: problemsTable.id })
      .from(problemsTable)
      .where(eq(problemsTable.slug, slug));
    if (!existing) return slug;
    suffix += 1;
    slug = `${base}-${suffix}`;
  }
}

async function getSolvedCountMap(): Promise<Map<number, number>> {
  const rows = await db
    .select({
      problemId: submissionsTable.problemId,
      solved: countDistinct(submissionsTable.userId),
    })
    .from(submissionsTable)
    .where(eq(submissionsTable.status, "accepted"))
    .groupBy(submissionsTable.problemId);

  const map = new Map<number, number>();
  for (const row of rows) map.set(row.problemId, Number(row.solved));
  return map;
}

router.get("/problems", async (req, res): Promise<void> => {
  const query = ListProblemsQueryParams.safeParse(req.query);
  if (!query.success) {
    res.status(400).json({ error: query.error.message });
    return;
  }

  const rows = query.data.difficulty
    ? await db
        .select()
        .from(problemsTable)
        .where(eq(problemsTable.difficulty, query.data.difficulty))
        .orderBy(problemsTable.id)
    : await db.select().from(problemsTable).orderBy(problemsTable.id);

  const solvedCounts = await getSolvedCountMap();

  const summaries = rows.map((row) => ({
    id: row.id,
    slug: row.slug,
    title: row.title,
    difficulty: row.difficulty,
    points: row.points,
    tags: row.tags,
    solvedCount: solvedCounts.get(row.id) ?? 0,
    createdAt: row.createdAt,
  }));

  res.json(ListProblemsResponse.parse(summaries));
});

router.post("/problems", async (req, res): Promise<void> => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }

  const parsed = CreateProblemBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const slug = await generateUniqueSlug(parsed.data.title);

  const [problem] = await db
    .insert(problemsTable)
    .values({
      title: parsed.data.title,
      description: parsed.data.description,
      difficulty: parsed.data.difficulty,
      points: parsed.data.points,
      tags: parsed.data.tags ?? [],
      cpuTimeLimitSeconds: parsed.data.cpuTimeLimitSeconds,
      memoryLimitKb: parsed.data.memoryLimitKb,
      createdById: req.user.id,
      slug,
    })
    .returning();

  if (!problem) {
    res.status(500).json({ error: "Failed to create problem" });
    return;
  }

  res.status(201).json(
    CreateProblemResponse.parse({
      ...problem,
      sampleTestCases: [],
      solvedCount: 0,
    }),
  );
});

router.get("/problems/:id", async (req, res): Promise<void> => {
  const params = GetProblemParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [problem] = await db.select().from(problemsTable).where(eq(problemsTable.id, params.data.id));
  if (!problem) {
    res.status(404).json({ error: "Problem not found" });
    return;
  }

  const sampleTestCases = await db
    .select()
    .from(testCasesTable)
    .where(and(eq(testCasesTable.problemId, problem.id), eq(testCasesTable.isSample, true)))
    .orderBy(testCasesTable.orderIndex);

  const solvedCounts = await getSolvedCountMap();

  res.json(
    GetProblemResponse.parse({
      ...problem,
      sampleTestCases,
      solvedCount: solvedCounts.get(problem.id) ?? 0,
    }),
  );
});

router.patch("/problems/:id", async (req, res): Promise<void> => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }

  const params = UpdateProblemParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = UpdateProblemBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [problem] = await db
    .update(problemsTable)
    .set(parsed.data)
    .where(eq(problemsTable.id, params.data.id))
    .returning();

  if (!problem) {
    res.status(404).json({ error: "Problem not found" });
    return;
  }

  const sampleTestCases = await db
    .select()
    .from(testCasesTable)
    .where(and(eq(testCasesTable.problemId, problem.id), eq(testCasesTable.isSample, true)))
    .orderBy(testCasesTable.orderIndex);

  const solvedCounts = await getSolvedCountMap();

  res.json(
    UpdateProblemResponse.parse({
      ...problem,
      sampleTestCases,
      solvedCount: solvedCounts.get(problem.id) ?? 0,
    }),
  );
});

router.delete("/problems/:id", async (req, res): Promise<void> => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }

  const params = DeleteProblemParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [problem] = await db.delete(problemsTable).where(eq(problemsTable.id, params.data.id)).returning();

  if (!problem) {
    res.status(404).json({ error: "Problem not found" });
    return;
  }

  res.sendStatus(204);
});

router.get("/problems/:id/testcases", async (req, res): Promise<void> => {
  const params = ListProblemTestCasesParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [problem] = await db.select().from(problemsTable).where(eq(problemsTable.id, params.data.id));
  if (!problem) {
    res.status(404).json({ error: "Problem not found" });
    return;
  }

  const testCases = await db
    .select()
    .from(testCasesTable)
    .where(eq(testCasesTable.problemId, params.data.id))
    .orderBy(testCasesTable.orderIndex);

  res.json(ListProblemTestCasesResponse.parse(testCases));
});

router.post("/problems/:id/testcases", async (req, res): Promise<void> => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }

  const params = CreateTestCaseParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = CreateTestCaseBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [problem] = await db.select().from(problemsTable).where(eq(problemsTable.id, params.data.id));
  if (!problem) {
    res.status(404).json({ error: "Problem not found" });
    return;
  }

  const existing = await db
    .select({ orderIndex: testCasesTable.orderIndex })
    .from(testCasesTable)
    .where(eq(testCasesTable.problemId, problem.id));
  const nextOrderIndex = existing.reduce((max, row) => Math.max(max, row.orderIndex), -1) + 1;

  const [testCase] = await db
    .insert(testCasesTable)
    .values({
      problemId: problem.id,
      stdin: parsed.data.stdin,
      expectedOutput: parsed.data.expectedOutput,
      isSample: parsed.data.isSample,
      points: parsed.data.points,
      orderIndex: nextOrderIndex,
    })
    .returning();

  if (!testCase) {
    res.status(500).json({ error: "Failed to create test case" });
    return;
  }

  res.status(201).json(CreateTestCaseResponse.parse(testCase));
});

router.delete("/testcases/:id", async (req, res): Promise<void> => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }

  const params = DeleteTestCaseParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [testCase] = await db.delete(testCasesTable).where(eq(testCasesTable.id, params.data.id)).returning();

  if (!testCase) {
    res.status(404).json({ error: "Test case not found" });
    return;
  }

  res.sendStatus(204);
});

export default router;
