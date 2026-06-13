import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { env } from "@/infrastructure/env";
import * as schema from "@/infrastructure/db/schema";

/** Single shared connection (reused across serverless invocations). */
let _db: ReturnType<typeof drizzle<typeof schema>> | null = null;

export function db() {
  if (!_db) {
    const client = postgres(env.databaseUrl(), { prepare: false });
    _db = drizzle(client, { schema });
  }
  return _db;
}

export type Database = ReturnType<typeof db>;
