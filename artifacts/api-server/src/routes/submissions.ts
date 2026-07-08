import { Router, type IRouter } from "express";
import { and, desc, eq } from "drizzle-orm";
import {
  db,
  submissionsTable,
  submissionTestResultsTable,
  problemsTable,
  languagesTable,
  testCasesTable,
} from "@workspace/db";
import {
  ListSubmissionsQueryParams,
  ListSubmissionsResponse,
  CreateSubmissionBody,
  CreateSubmissionResponse,
  GetSubmissionParams,
  GetSubmissionResponse,
} from "@workspace/api-zod";
import { submitToJudge0 } from "../lib/judge0.js";
import { enqueueJudge0Dispatch } from "../lib/queue.js";
import { getPublicBaseUrl } from "../lib/publicUrl.js";
import { logger } from "../lib/logger.js";

const router: IRouter = Router();

function serializeTestResult(row: typeof submissionTestResultsTable.$inferSelect, points: number, isSample: boolean) {
  const revealDetails = isSample || row.status === "compilation_error";
  return {
    id: row.id,
    testCaseId: row.testCaseId,
    status: row.status,
    isSample,
    points,
    earnedPoints: row.status === "accepted" ? points : 0,
    timeMs: row.timeMs,
    memoryKb: row.memoryKb,
    stdout: revealDetails ? row.stdout : null,
    stderr: revealDetails ? row.stderr : null,
    compileOutput: row.compileOutput,
  };
}

router.get("/submissions", async (req, res): Promise<void> => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }

  const query = ListSubmissionsQueryParams.safeParse(req.query);
  if (!query.success) {
    res.status(400).json({ error: query.error.message });
    return;
  }

  const conditions = [eq(submissionsTable.userId, req.user.id)];
  if (query.data.problemId !== undefined) conditions.push(eq(submissionsTable.problemId, query.data.problemId));
  if (query.data.contestId !== undefined) conditions.push(eq(submissionsTable.contestId, query.data.contestId));

  const rows = await db
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
    .where(and(...conditions))
    .orderBy(desc(submissionsTable.submittedAt));

  res.json(ListSubmissionsResponse.parse(rows));
});

router.post("/submissions", async (req, res): Promise<void> => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }

  const parsed = CreateSubmissionBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [problem] = await db.select().from(problemsTable).where(eq(problemsTable.id, parsed.data.problemId));
  if (!problem) {
    res.status(400).json({ error: "Problem not found" });
    return;
  }

  const [language] = await db.select().from(languagesTable).where(eq(languagesTable.id, parsed.data.languageId));
  if (!language) {
    res.status(400).json({ error: "Language not found" });
    return;
  }

  const testCases = await db
    .select()
    .from(testCasesTable)
    .where(eq(testCasesTable.problemId, problem.id))
    .orderBy(testCasesTable.orderIndex);

  if (testCases.length === 0) {
    res.status(400).json({ error: "Problem has no test cases yet" });
    return;
  }

  const maxScore = testCases.reduce((sum, tc) => sum + tc.points, 0);

  const [submission] = await db
    .insert(submissionsTable)
    .values({
      userId: req.user.id,
      problemId: problem.id,
      contestId: parsed.data.contestId ?? null,
      languageId: language.id,
      sourceCode: parsed.data.sourceCode,
      status: "queued",
      score: 0,
      maxScore,
    })
    .returning();

  if (!submission) {
    res.status(500).json({ error: "Failed to create submission" });
    return;
  }

  const testResults = await db
    .insert(submissionTestResultsTable)
    .values(
      testCases.map((tc) => ({
        submissionId: submission.id,
        testCaseId: tc.id,
        status: "queued" as const,
      })),
    )
    .returning();

  const cpuTimeLimitSeconds = problem.cpuTimeLimitSeconds * language.timeMultiplier;
  const memoryLimitKb = Math.round(problem.memoryLimitKb * language.memoryMultiplier);
  const publicBaseUrl = getPublicBaseUrl(req);

  for (const testResult of testResults) {
    const testCase = testCases.find((tc) => tc.id === testResult.testCaseId);
    if (!testCase) continue;

    enqueueJudge0Dispatch(async () => {
      try {
        const { token } = await submitToJudge0({
          sourceCode: submission.sourceCode,
          languageId: language.judge0Id,
          stdin: testCase.stdin,
          expectedOutput: testCase.expectedOutput,
          cpuTimeLimitSeconds,
          memoryLimitKb,
          callbackUrl: `${publicBaseUrl}/api/judge0/callback/${testResult.id}`,
        });

        await db
          .update(submissionTestResultsTable)
          .set({ judge0Token: token, status: "processing" })
          .where(eq(submissionTestResultsTable.id, testResult.id));
      } catch (err) {
        logger.error({ err, testResultId: testResult.id }, "Failed to dispatch submission to Judge0");
        await db
          .update(submissionTestResultsTable)
          .set({ status: "internal_error" })
          .where(eq(submissionTestResultsTable.id, testResult.id));
        const { recomputeSubmissionOutcome } = await import("../lib/submissionScoring");
        await recomputeSubmissionOutcome(submission.id);
      }
    });
  }

  res.status(201).json(
    CreateSubmissionResponse.parse({
      ...submission,
      problemTitle: problem.title,
      languageName: language.name,
      testResults: testResults.map((tr) => serializeTestResult(tr, testCases.find((tc) => tc.id === tr.testCaseId)?.points ?? 0, testCases.find((tc) => tc.id === tr.testCaseId)?.isSample ?? false)),
    }),
  );
});

router.get("/submissions/:id", async (req, res): Promise<void> => {
  const params = GetSubmissionParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [row] = await db
    .select({
      id: submissionsTable.id,
      userId: submissionsTable.userId,
      problemId: submissionsTable.problemId,
      problemTitle: problemsTable.title,
      contestId: submissionsTable.contestId,
      languageId: submissionsTable.languageId,
      languageName: languagesTable.name,
      sourceCode: submissionsTable.sourceCode,
      status: submissionsTable.status,
      score: submissionsTable.score,
      maxScore: submissionsTable.maxScore,
      submittedAt: submissionsTable.submittedAt,
      judgedAt: submissionsTable.judgedAt,
    })
    .from(submissionsTable)
    .innerJoin(problemsTable, eq(submissionsTable.problemId, problemsTable.id))
    .innerJoin(languagesTable, eq(submissionsTable.languageId, languagesTable.id))
    .where(eq(submissionsTable.id, params.data.id));

  if (!row) {
    res.status(404).json({ error: "Submission not found" });
    return;
  }

  if (!req.isAuthenticated() || req.user.id !== row.userId) {
    res.status(404).json({ error: "Submission not found" });
    return;
  }

  const testResultRows = await db
    .select()
    .from(submissionTestResultsTable)
    .where(eq(submissionTestResultsTable.submissionId, row.id));

  const testCaseIds = testResultRows.map((tr) => tr.testCaseId);
  const testCases =
    testCaseIds.length > 0
      ? await db.select().from(testCasesTable).where(eq(testCasesTable.problemId, row.problemId))
      : [];
  const testCaseById = new Map(testCases.map((tc) => [tc.id, tc]));

  res.json(
    GetSubmissionResponse.parse({
      ...row,
      testResults: testResultRows.map((tr) => {
        const tc = testCaseById.get(tr.testCaseId);
        return serializeTestResult(tr, tc?.points ?? 0, tc?.isSample ?? false);
      }),
    }),
  );
});

export default router;
