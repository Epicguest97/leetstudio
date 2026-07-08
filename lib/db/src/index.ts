import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema/index.js";

const { Pool } = pg;
const databaseUrl = process.env.DATABASE_URL?.trim();

export const pool = databaseUrl ? new Pool({ connectionString: databaseUrl }) : null;
export const db = databaseUrl
  ? drizzle(pool!, { schema })
  : (process.env.VERCEL
      ? (() => { throw new Error("DATABASE_URL environment variable is required on Vercel but is not set."); })()
      : await (async () => {
          const { initializeLocalDatabase } = await import("./local-bootstrap.js");
          return initializeLocalDatabase();
        })());

export * from "./schema/index.js";
