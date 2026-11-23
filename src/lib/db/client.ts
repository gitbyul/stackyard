import { mkdirSync } from "node:fs";

import { neon } from "@neondatabase/serverless";
import { PGlite } from "@electric-sql/pglite";
import { drizzle as drizzleNeon, type NeonHttpDatabase } from "drizzle-orm/neon-http";
import { drizzle as drizzlePglite } from "drizzle-orm/pglite";

import * as schema from "./schema";

export const LOCAL_DB_DIR = ".data/pglite";

/** True when DATABASE_URL points at a real Postgres (Neon in production). */
export function usesRemoteDb() {
  return /^postgres(ql)?:\/\//.test(process.env.DATABASE_URL ?? "");
}

/**
 * Neon over HTTP when DATABASE_URL is set (Vercel), otherwise an embedded
 * PGlite database on disk so local development needs no Postgres install.
 */
export function createDb(): Db {
  if (usesRemoteDb()) {
    return drizzleNeon(neon(process.env.DATABASE_URL!), { schema });
  }
  // Both drivers speak the same query API; type them as one so callers
  // don't have to narrow a union.
  mkdirSync(LOCAL_DB_DIR, { recursive: true });
  return drizzlePglite(new PGlite(LOCAL_DB_DIR), {
    schema,
  }) as unknown as Db;
}

export type Db = NeonHttpDatabase<typeof schema>;
