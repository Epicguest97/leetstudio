import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema";
import { initializeLocalDatabase } from "./local-bootstrap";

const { Pool } = pg;
const databaseUrl = process.env.DATABASE_URL?.trim();

export const pool = databaseUrl ? new Pool({ connectionString: databaseUrl }) : null;
export const db = databaseUrl ? drizzle(pool!, { schema }) : await initializeLocalDatabase();

export * from "./schema";
