import { db, submissionsTable, submissionTestResultsTable, testCasesTable } from "@workspace/db";
import { eq, inArray } from "drizzle-orm";
import { logger } from "./logger";

const FAILURE_PRIORITY: Record<string, number> = {
  compilation_error: 0,
  internal_error: 1,
  runtime_error: 2,
  time_limit_exceeded: 3,
  memory_limit_exceeded: 4,
  wrong_answer: 5,
};

/**
 * Recomputes a submission's aggregate status/score once its test results change.
 * Called after every Judge0 callback. Idempotent — safe to call multiple times.
 */
export async function recomputeSubmissionOutcome(submissionId: number): Promise<void> {
  const results = await db
    .select()
    .from(submissionTestResultsTable)
    .where(eq(submissionTestResultsTable.submissionId, submissionId));

  if (results.length === 0) return;

  const [submission] = await db.select().from(submissionsTable).where(eq(submissionsTable.id, submissionId));
  if (!submission) {
    logger.warn({ submissionId }, "Submission not found while recomputing outcome");
    return;
  }

  const testCaseIds = results.map((r) => r.testCaseId);
  const testCases = await db.select().from(testCasesTable).where(inArray(testCasesTable.id, testCaseIds));
  const pointsByTestCaseId = new Map(testCases.map((tc) => [tc.id, tc.points]));

  const maxScore = results.reduce((sum, r) => sum + (pointsByTestCaseId.get(r.testCaseId) ?? 0), 0);
  const score = results.reduce(
    (sum, r) => sum + (r.status === "accepted" ? pointsByTestCaseId.get(r.testCaseId) ?? 0 : 0),
    0,
  );

  const stillPending = results.some((r) => r.status === "queued" || r.status === "processing");

  if (stillPending) {
    await db
      .update(submissionsTable)
      .set({ status: "judging", score, maxScore })
      .where(eq(submissionsTable.id, submissionId));
    return;
  }

  const allAccepted = results.every((r) => r.status === "accepted");
  let finalStatus: (typeof submissionsTable.$inferSelect)["status"];

  if (allAccepted) {
    finalStatus = "accepted";
  } else if (score > 0) {
    finalStatus = "partial";
  } else {
    const worst = results
      .filter((r) => r.status !== "accepted")
      .sort((a, b) => (FAILURE_PRIORITY[a.status] ?? 99) - (FAILURE_PRIORITY[b.status] ?? 99))[0];
    finalStatus = (worst?.status as typeof finalStatus) ?? "internal_error";
  }

  await db
    .update(submissionsTable)
    .set({ status: finalStatus, score, maxScore, judgedAt: new Date() })
    .where(eq(submissionsTable.id, submissionId));
}
