import "server-only";
import { defineRelations } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

export const relations = defineRelations(schema);

const globalForDb = globalThis as unknown as { pool?: Pool };

// Reuse one pool across hot reloads in dev and across invocations of a warm serverless instance.
const pool =
  globalForDb.pool ??
  new Pool({
    connectionString: process.env.DATABASE_URL,
    max: process.env.VERCEL ? 1 : 10,
  });
if (process.env.NODE_ENV !== "production") globalForDb.pool = pool;

export const db = drizzle({ client: pool, relations });
export { schema };
