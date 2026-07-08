import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema";
import { initializeLocalDatabase } from "./local-bootstrap";

const { Pool } = pg;
const databaseUrl = process.env.DATABASE_URL?.trim();

export const pool = databaseUrl ? new Pool({ connectionString: databaseUrl }) : null;
export const db = databaseUrl
  ? drizzle(pool!, { schema })
  : (process.env.VERCEL
      ? (() => { throw new Error("DATABASE_URL environment variable is required on Vercel but is not set."); })()
      : await initializeLocalDatabase());

export * from "./schema";
