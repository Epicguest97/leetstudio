import { integer, pgEnum, pgTable, serial, text, timestamp, varchar } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./auth";
import { problemsTable } from "./problems";
import { contestsTable } from "./contests";
import { languagesTable } from "./languages";

export const submissionStatusEnum = pgEnum("submission_status", [
  "queued",
  "judging",
  "accepted",
  "partial",
  "wrong_answer",
  "time_limit_exceeded",
  "memory_limit_exceeded",
  "runtime_error",
  "compilation_error",
  "internal_error",
]);

export const submissionsTable = pgTable("submissions", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id")
    .notNull()
    .references(() => usersTable.id, { onDelete: "cascade" }),
  problemId: integer("problem_id")
    .notNull()
    .references(() => problemsTable.id, { onDelete: "cascade" }),
  contestId: integer("contest_id").references(() => contestsTable.id, { onDelete: "set null" }),
  languageId: integer("language_id")
    .notNull()
    .references(() => languagesTable.id),
  sourceCode: text("source_code").notNull(),
  status: submissionStatusEnum("status").notNull().default("queued"),
  score: integer("score").notNull().default(0),
  maxScore: integer("max_score").notNull().default(0),
  submittedAt: timestamp("submitted_at", { withTimezone: true }).notNull().defaultNow(),
  judgedAt: timestamp("judged_at", { withTimezone: true }),
});

export const insertSubmissionSchema = createInsertSchema(submissionsTable).omit({
  id: true,
  submittedAt: true,
  judgedAt: true,
});
export type InsertSubmission = z.infer<typeof insertSubmissionSchema>;
export type SubmissionRow = typeof submissionsTable.$inferSelect;
