import type { BatchItem } from "drizzle-orm/batch";
import type { PgliteDatabase } from "drizzle-orm/pglite";

import { usesRemoteDb, type Db } from "./client";
import type * as schema from "./schema";

/**
 * Runs a list of writes all-or-nothing on `db`. Neon's HTTP driver has no
 * interactive transactions, but a batch runs as one transaction; the local
 * PGlite database gets a regular transaction. `build` receives the handle
 * the queries must be created on. Takes the database explicitly so scripts
 * (seed) and the app share it.
 */
export async function runAtomic(db: Db, build: (q: Db) => BatchItem<"pg">[]): Promise<void> {
  if (usesRemoteDb()) {
    const items = build(db);
    if (items.length > 0) await db.batch(items as [BatchItem<"pg">, ...BatchItem<"pg">[]]);
    return;
  }
  await (db as unknown as PgliteDatabase<typeof schema>).transaction(async (tx) => {
    for (const query of build(tx as unknown as Db)) await query;
  });
}
