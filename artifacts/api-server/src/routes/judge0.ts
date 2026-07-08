import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, submissionTestResultsTable, submissionsTable, problemsTable, languagesTable } from "@workspace/db";
import { ReceiveJudge0CallbackParams, ReceiveJudge0CallbackBody, ReceiveJudge0CallbackResponse } from "@workspace/api-zod";
import { mapJudge0StatusToTestResultStatus } from "../lib/judge0.js";
import { recomputeSubmissionOutcome } from "../lib/submissionScoring.js";
import { logger } from "../lib/logger.js";

const router: IRouter = Router();

/**
 * Judge0 posts here once a submitted test case finishes executing. This is the
 * asynchronous half of the submission flow: our server never polls Judge0.
 */
router.post("/judge0/callback/:testResultId", async (req, res): Promise<void> => {
  const params = ReceiveJudge0CallbackParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = ReceiveJudge0CallbackBody.safeParse(req.body);
  if (!parsed.success) {
    logger.warn({ body: req.body, error: parsed.error.message }, "Invalid Judge0 callback payload");
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [testResult] = await db
    .select()
    .from(submissionTestResultsTable)
    .where(eq(submissionTestResultsTable.id, params.data.testResultId));

  if (!testResult) {
    logger.warn({ testResultId: params.data.testResultId }, "Judge0 callback for unknown test result");
    res.json(ReceiveJudge0CallbackResponse.parse({ received: true }));
    return;
  }

  const [submission] = await db.select().from(submissionsTable).where(eq(submissionsTable.id, testResult.submissionId));
  const problem = submission
    ? (await db.select().from(problemsTable).where(eq(problemsTable.id, submission.problemId)))[0]
    : undefined;
  const language = submission
    ? (await db.select().from(languagesTable).where(eq(languagesTable.id, submission.languageId)))[0]
    : undefined;

  const statusId = parsed.data.status?.id ?? 13;
  let status = mapJudge0StatusToTestResultStatus(statusId);

  const memoryKb = parsed.data.memory ?? null;
  if (
    status === "accepted" &&
    problem &&
    language &&
    memoryKb !== null &&
    memoryKb > problem.memoryLimitKb * language.memoryMultiplier
  ) {
    status = "memory_limit_exceeded";
  }

  const timeMs = parsed.data.time ? Math.round(parseFloat(parsed.data.time) * 1000) : null;

  await db
    .update(submissionTestResultsTable)
    .set({
      status,
      timeMs,
      memoryKb,
      stdout: parsed.data.stdout ?? null,
      stderr: parsed.data.stderr ?? null,
      compileOutput: parsed.data.compile_output ?? null,
    })
    .where(eq(submissionTestResultsTable.id, testResult.id));

  await recomputeSubmissionOutcome(testResult.submissionId);

  res.json(ReceiveJudge0CallbackResponse.parse({ received: true }));
});

export default router;
