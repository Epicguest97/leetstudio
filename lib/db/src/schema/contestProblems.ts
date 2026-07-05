import { integer, pgTable, serial, varchar } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { contestsTable } from "./contests";
import { problemsTable } from "./problems";

export const contestProblemsTable = pgTable("contest_problems", {
  id: serial("id").primaryKey(),
  contestId: integer("contest_id")
    .notNull()
    .references(() => contestsTable.id, { onDelete: "cascade" }),
  problemId: integer("problem_id")
    .notNull()
    .references(() => problemsTable.id, { onDelete: "cascade" }),
  points: integer("points").notNull().default(100),
  label: varchar("label").notNull().default("A"),
});

export const insertContestProblemSchema = createInsertSchema(contestProblemsTable).omit({ id: true });
export type InsertContestProblem = z.infer<typeof insertContestProblemSchema>;
export type ContestProblemRow = typeof contestProblemsTable.$inferSelect;
