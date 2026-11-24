import { and, eq, isNull, like } from "drizzle-orm";

import { runAtomic } from "@/lib/db/atomic";
import type { Db } from "@/lib/db/client";
import * as s from "@/lib/db/schema";
import { buildSampleData } from "./sample-data";

/** Suffix for project codes while a fresh copy is being staged. */
const STAGING = "~staging";
const CHUNK = 1000;
/** Concurrent INSERTs per table; keeps the reset quick without flooding the database. */
const PARALLEL = 4;

async function insertChunked(db: Db, table: Parameters<Db["insert"]>[0], rows: Record<string, unknown>[]) {
  const parts: Record<string, unknown>[][] = [];
  for (let i = 0; i < rows.length; i += CHUNK) parts.push(rows.slice(i, i + CHUNK));
  for (let i = 0; i < parts.length; i += PARALLEL) {
    await Promise.all(parts.slice(i, i + PARALLEL).map((part) => db.insert(table).values(part as never)));
  }
}

export type ResetSummary = {
  projects: number;
  sites: number;
  skus: number;
  orderLines: number;
  laborLogs: number;
  removedProjects: number;
};

/**
 * Replaces everything the demo account owns with a fresh copy of the
 * sample data, without visitors ever seeing a half-built workspace:
 *
 * 1. Stage the new rows under projects that have no owner and a temporary
 *    code. No page shows them (every query filters by owner), so they can
 *    be written in many small requests.
 * 2. In one atomic step, delete the demo account's current projects (FK
 *    cascades remove sites, SKUs, orders, layouts, logs and maps) and hand
 *    the staged projects to the demo account under their real codes.
 *
 * A run that dies during staging leaves owner-less staged projects; the
 * next run deletes them first. The demo user and its sessions are kept.
 */
export async function replaceDemoData(db: Db, ownerId: string): Promise<ResetSummary> {
  await db.delete(s.project).where(and(isNull(s.project.ownerId), like(s.project.code, `%${STAGING}`)));

  const data = buildSampleData(ownerId, { idTag: `${Date.now().toString(36)}_` });

  await db.insert(s.project).values(data.projects.map((p) => ({ ...p, ownerId: null, code: `${p.code}${STAGING}` })));
  await db.insert(s.site).values(data.sites);
  await Promise.all([
    db.insert(s.processMap).values(data.processMaps),
    db.insert(s.layout).values(data.layouts),
    insertChunked(db, s.sku, data.skus),
  ]);
  await Promise.all([
    db.insert(s.processMapVersion).values(data.processMapVersions),
    insertChunked(db, s.orderLine, data.orderLines),
    insertChunked(db, s.laborLog, data.laborLogs),
  ]);

  const current = await db.$count(s.project, eq(s.project.ownerId, ownerId));
  await runAtomic(db, (q) => [
    // Staged projects have no owner yet, so this only removes the current copy
    // (and anything visitors created on the demo account since the last reset).
    q.delete(s.project).where(eq(s.project.ownerId, ownerId)),
    ...data.projects.map((p) => q.update(s.project).set({ ownerId, code: p.code }).where(eq(s.project.id, p.id!))),
  ]);

  return {
    projects: data.projects.length,
    sites: data.sites.length,
    skus: data.skus.length,
    orderLines: data.orderLines.length,
    laborLogs: data.laborLogs.length,
    removedProjects: current,
  };
}
