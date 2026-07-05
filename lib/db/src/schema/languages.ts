import { integer, pgTable, real, serial, varchar } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const languagesTable = pgTable("languages", {
  id: serial("id").primaryKey(),
  name: varchar("name").notNull(),
  judge0Id: integer("judge0_id").notNull(),
  monacoId: varchar("monaco_id").notNull(),
  timeMultiplier: real("time_multiplier").notNull().default(1),
  memoryMultiplier: real("memory_multiplier").notNull().default(1),
});

export const insertLanguageSchema = createInsertSchema(languagesTable).omit({ id: true });
export type InsertLanguage = z.infer<typeof insertLanguageSchema>;
export type LanguageRow = typeof languagesTable.$inferSelect;
