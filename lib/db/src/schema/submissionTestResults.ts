import { integer, pgEnum, pgTable, real, serial, text, varchar } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { submissionsTable } from "./submissions";
import { testCasesTable } from "./testCases";

export const testResultStatusEnum = pgEnum("test_result_status", [
  "queued",
  "processing",
  "accepted",
  "wrong_answer",
  "time_limit_exceeded",
  "memory_limit_exceeded",
  "runtime_error",
  "compilation_error",
  "internal_error",
]);

export const submissionTestResultsTable = pgTable("submission_test_results", {
  id: serial("id").primaryKey(),
  submissionId: integer("submission_id")
    .notNull()
    .references(() => submissionsTable.id, { onDelete: "cascade" }),
  testCaseId: integer("test_case_id")
    .notNull()
    .references(() => testCasesTable.id, { onDelete: "cascade" }),
  judge0Token: varchar("judge0_token"),
  status: testResultStatusEnum("status").notNull().default("queued"),
  timeMs: real("time_ms"),
  memoryKb: integer("memory_kb"),
  stdout: text("stdout"),
  stderr: text("stderr"),
  compileOutput: text("compile_output"),
});

export const insertSubmissionTestResultSchema = createInsertSchema(submissionTestResultsTable).omit({ id: true });
export type InsertSubmissionTestResult = z.infer<typeof insertSubmissionTestResultSchema>;
export type SubmissionTestResultRow = typeof submissionTestResultsTable.$inferSelect;
