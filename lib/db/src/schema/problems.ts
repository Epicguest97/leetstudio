import { integer, pgEnum, pgTable, real, serial, text, timestamp, varchar } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./auth";

export const problemDifficultyEnum = pgEnum("problem_difficulty", ["easy", "medium", "hard"]);

export const problemsTable = pgTable("problems", {
  id: serial("id").primaryKey(),
  slug: varchar("slug").notNull().unique(),
  title: varchar("title").notNull(),
  description: text("description").notNull(),
  difficulty: problemDifficultyEnum("difficulty").notNull().default("easy"),
  points: integer("points").notNull().default(100),
  tags: text("tags").array().notNull().default([]),
  cpuTimeLimitSeconds: real("cpu_time_limit_seconds").notNull().default(2),
  memoryLimitKb: integer("memory_limit_kb").notNull().default(262144),
  createdById: varchar("created_by_id").references(() => usersTable.id),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertProblemSchema = createInsertSchema(problemsTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertProblem = z.infer<typeof insertProblemSchema>;
export type ProblemRow = typeof problemsTable.$inferSelect;
