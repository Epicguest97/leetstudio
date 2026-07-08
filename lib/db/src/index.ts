import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema/index.js";

const { Pool } = pg;
const databaseUrl = process.env.DATABASE_URL?.trim();

export const pool = databaseUrl ? new Pool({ connectionString: databaseUrl }) : null;
export const db: NodePgDatabase<typeof schema> = (databaseUrl
  ? drizzle(pool!, { schema })
  : await (async () => {
      const { initializeLocalDatabase } = await import("./local-bootstrap.js");
      return initializeLocalDatabase();
    })()) as any;

export * from "./schema/index.js";
