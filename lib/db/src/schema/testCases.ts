import { boolean, integer, pgTable, serial, text } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { problemsTable } from "./problems";

export const testCasesTable = pgTable("test_cases", {
  id: serial("id").primaryKey(),
  problemId: integer("problem_id")
    .notNull()
    .references(() => problemsTable.id, { onDelete: "cascade" }),
  stdin: text("stdin").notNull().default(""),
  expectedOutput: text("expected_output").notNull(),
  isSample: boolean("is_sample").notNull().default(false),
  points: integer("points").notNull().default(0),
  orderIndex: integer("order_index").notNull().default(0),
});

export const insertTestCaseSchema = createInsertSchema(testCasesTable).omit({ id: true });
export type InsertTestCase = z.infer<typeof insertTestCaseSchema>;
export type TestCaseRow = typeof testCasesTable.$inferSelect;
