"use server";

import { and, asc, eq, inArray, notInArray, sql } from "drizzle-orm";
import { z } from "zod";

import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { runAtomic } from "@/lib/db/atomic";
import { laborLog, orderLine, project, site, sku } from "@/lib/db/schema";
import { findOwnedSite } from "@/lib/data/datasets";
import { toCsv } from "@/lib/import/csv";
import {
  COLUMNS,
  DATASETS,
  fieldOf,
  IMPORT_MODES,
  MAX_IMPORT_BYTES,
  parseDataset,
  type DatasetKind,
  type ImportMode,
  type Issue,
} from "@/lib/import/datasets";
import { INDUSTRIES } from "@/lib/productivity/benchmarks";

/** Rows per INSERT statement; well under Postgres' 65,535 parameter limit. */
const CHUNK = 1000;

function chunks<T>(rows: T[]): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < rows.length; i += CHUNK) out.push(rows.slice(i, i + CHUNK));
  return out;
}

const newId = (prefix: string) => `${prefix}_${crypto.randomUUID()}`;

export type ImportResult =
  | { ok: true; inserted: number; updated: number; removed: number }
  | { ok: false; error: "notFound" | "badRequest" | "tooLarge" }
  | { ok: false; error: "invalid"; issues: Issue[]; issueCount: number };

/**
 * Validates the whole file and writes nothing unless every row is valid.
 * The write itself is atomic, so a failure never leaves half an import.
 */
export async function importDataset(
  siteId: string,
  kind: DatasetKind,
  mode: ImportMode,
  csv: string,
): Promise<ImportResult> {
  const me = await requireUser();
  if (!DATASETS.includes(kind) || !(IMPORT_MODES[kind] as readonly string[]).includes(mode) || typeof csv !== "string") {
    return { ok: false, error: "badRequest" };
  }
  if (new TextEncoder().encode(csv).length > MAX_IMPORT_BYTES) return { ok: false, error: "tooLarge" };
  if (!(await findOwnedSite(siteId, me.id))) return { ok: false, error: "notFound" };

  const replace = mode === "replace";

  if (kind === "skus") {
    const parsed = parseDataset("skus", csv);
    if (parsed.issueCount > 0) return { ok: false, error: "invalid", issues: parsed.issues, issueCount: parsed.issueCount };
    const codes = parsed.rows.map((r) => r.code);
    const existing = await db.select({ code: sku.code }).from(sku).where(eq(sku.siteId, siteId));
    const existingCodes = new Set(existing.map((r) => r.code));
    const updated = codes.filter((c) => existingCodes.has(c)).length;
    const keep = new Set(codes);
    const removed = replace ? existing.filter((r) => !keep.has(r.code)).length : 0;

    await runAtomic(db, (q) => [
      // Replace = the file becomes the SKU master. Dropping a SKU also drops
      // its order lines (FK cascade); SKUs still in the file keep theirs.
      ...(replace && removed > 0 ? [q.delete(sku).where(and(eq(sku.siteId, siteId), notInArray(sku.code, codes)))] : []),
      ...chunks(parsed.rows).map((part) =>
        q
          .insert(sku)
          .values(part.map((r) => ({ id: newId("sku"), siteId, ...r })))
          .onConflictDoUpdate({
            target: [sku.siteId, sku.code],
            set: {
              name: sql`excluded.name`,
              category: sql`excluded.category`,
              lengthMm: sql`excluded.length_mm`,
              widthMm: sql`excluded.width_mm`,
              heightMm: sql`excluded.height_mm`,
              weightKg: sql`excluded.weight_kg`,
              unitsPerCase: sql`excluded.units_per_case`,
            },
          }),
      ),
    ]);
    return { ok: true, inserted: codes.length - updated, updated, removed };
  }

  if (kind === "orderLines") {
    const parsed = parseDataset("orderLines", csv);
    if (parsed.issueCount > 0) return { ok: false, error: "invalid", issues: parsed.issues, issueCount: parsed.issueCount };
    const skus = await db.select({ id: sku.id, code: sku.code }).from(sku).where(eq(sku.siteId, siteId));
    const idByCode = new Map(skus.map((s) => [s.code, s.id]));

    // Order lines point at SKUs, so every code must already be in the SKU master.
    const issues: Issue[] = [];
    let issueCount = 0;
    parsed.rows.forEach((r, i) => {
      if (idByCode.has(r.skuCode)) return;
      issueCount++;
      if (issues.length < 100) issues.push({ row: parsed.rowNumbers[i], column: "sku_code", code: "unknownSku", value: r.skuCode });
    });
    if (issueCount > 0) return { ok: false, error: "invalid", issues, issueCount };

    const removed = replace ? await countRows("orderLines", siteId) : 0;
    await runAtomic(db, (q) => [
      ...(replace ? [q.delete(orderLine).where(eq(orderLine.siteId, siteId))] : []),
      ...chunks(parsed.rows).map((part) =>
        q.insert(orderLine).values(
          part.map((r) => ({
            id: newId("ol"),
            siteId,
            skuId: idByCode.get(r.skuCode)!,
            orderNo: r.orderNo,
            shippedOn: r.shippedOn,
            quantity: r.quantity,
          })),
        ),
      ),
    ]);
    return { ok: true, inserted: parsed.rows.length, updated: 0, removed };
  }

  const parsed = parseDataset("laborLogs", csv);
  if (parsed.issueCount > 0) return { ok: false, error: "invalid", issues: parsed.issues, issueCount: parsed.issueCount };
  const removed = replace ? await countRows("laborLogs", siteId) : 0;
  await runAtomic(db, (q) => [
    ...(replace ? [q.delete(laborLog).where(eq(laborLog.siteId, siteId))] : []),
    ...chunks(parsed.rows).map((part) => q.insert(laborLog).values(part.map((r) => ({ id: newId("lab"), siteId, ...r })))),
  ]);
  return { ok: true, inserted: parsed.rows.length, updated: 0, removed };
}

async function countRows(kind: DatasetKind, siteId: string) {
  const table = kind === "skus" ? sku : kind === "orderLines" ? orderLine : laborLog;
  const [{ n }] = await db.select({ n: sql<number>`count(*)::int` }).from(table).where(eq(table.siteId, siteId));
  return n;
}

/** The site's current rows in the import format, so an export can be edited and re-imported. */
export async function exportDataset(
  siteId: string,
  kind: DatasetKind,
): Promise<{ ok: true; csv: string } | { ok: false; error: "notFound" | "badRequest" }> {
  const me = await requireUser();
  if (!DATASETS.includes(kind)) return { ok: false, error: "badRequest" };
  if (!(await findOwnedSite(siteId, me.id))) return { ok: false, error: "notFound" };

  let rows: Record<string, string | number>[];
  if (kind === "skus") {
    rows = await db.select().from(sku).where(eq(sku.siteId, siteId)).orderBy(asc(sku.code));
  } else if (kind === "orderLines") {
    rows = await db
      .select({ orderNo: orderLine.orderNo, shippedOn: orderLine.shippedOn, skuCode: sku.code, quantity: orderLine.quantity })
      .from(orderLine)
      .innerJoin(sku, eq(orderLine.skuId, sku.id))
      .where(eq(orderLine.siteId, siteId))
      .orderBy(asc(orderLine.shippedOn), asc(orderLine.orderNo), asc(sku.code));
  } else {
    rows = await db
      .select()
      .from(laborLog)
      .where(eq(laborLog.siteId, siteId))
      .orderBy(asc(laborLog.workDate), asc(laborLog.shift), asc(laborLog.process));
  }
  const cols = COLUMNS[kind].map((c) => c.name);
  return { ok: true, csv: toCsv([cols, ...rows.map((r) => cols.map((c) => r[fieldOf(c)] ?? ""))]) };
}

/** Deletes every row of one dataset for a site. Clearing SKUs also clears order lines. */
export async function clearDataset(
  siteId: string,
  kind: DatasetKind,
): Promise<{ ok: true; removed: number } | { ok: false; error: "notFound" | "badRequest" }> {
  const me = await requireUser();
  if (!DATASETS.includes(kind)) return { ok: false, error: "badRequest" };
  if (!(await findOwnedSite(siteId, me.id))) return { ok: false, error: "notFound" };
  const removed = await countRows(kind, siteId);
  const table = kind === "skus" ? sku : kind === "orderLines" ? orderLine : laborLog;
  await db.delete(table).where(eq(table.siteId, siteId));
  return { ok: true, removed };
}

/* ------------------------------------------------------------------ */
/* Projects and sites                                                  */
/* ------------------------------------------------------------------ */

const projectInput = z.object({
  name: z.string().trim().min(1).max(80),
  client: z.string().trim().min(1).max(80),
  industry: z.enum(INDUSTRIES),
});

export type CreateResult = { ok: true; id: string } | { ok: false; error: "invalid" | "notFound" | "retry" };

export async function createProject(input: z.input<typeof projectInput>): Promise<CreateResult> {
  const me = await requireUser();
  const parsed = projectInput.safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalid" };

  // Project codes are unique across the database; retry on the rare clash.
  for (let attempt = 0; attempt < 3; attempt++) {
    const id = newId("prj");
    const code = `PRJ-${crypto.randomUUID().slice(0, 6).toUpperCase()}`;
    const clash = await db.select({ id: project.id }).from(project).where(eq(project.code, code));
    if (clash.length > 0) continue;
    await db.insert(project).values({
      id,
      code,
      ...parsed.data,
      status: "discovery",
      startedOn: new Date().toISOString().slice(0, 10),
      ownerId: me.id,
    });
    return { ok: true, id };
  }
  return { ok: false, error: "retry" };
}

const siteInput = z.object({
  projectId: z.string().min(1),
  name: z.string().trim().min(1).max(80),
  city: z.string().trim().min(1).max(80),
  floorArea: z.number().positive().max(2_000_000),
  clearHeight: z.number().positive().max(60),
  dockDoors: z.number().int().min(0).max(1000),
});

export async function createSite(input: z.input<typeof siteInput>): Promise<CreateResult> {
  const me = await requireUser();
  const parsed = siteInput.safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalid" };
  const [owned] = await db
    .select({ id: project.id })
    .from(project)
    .where(and(eq(project.id, parsed.data.projectId), eq(project.ownerId, me.id)));
  if (!owned) return { ok: false, error: "notFound" };
  const id = newId("site");
  await db.insert(site).values({ id, ...parsed.data });
  return { ok: true, id };
}

/**
 * Deletes a project with every site under it and, through the FK cascades,
 * their SKUs, orders, layouts, logs and maps. One statement, so it is atomic.
 */
export async function deleteProject(projectId: string): Promise<{ ok: true } | { ok: false; error: "notFound" }> {
  const me = await requireUser();
  if (typeof projectId !== "string" || projectId.length === 0) return { ok: false, error: "notFound" };
  const removed = await db
    .delete(project)
    .where(and(eq(project.id, projectId), eq(project.ownerId, me.id)))
    .returning({ id: project.id });
  return removed.length > 0 ? { ok: true } : { ok: false, error: "notFound" };
}

/** Deletes a site and everything under it (SKUs, orders, layouts, logs, maps). */
export async function deleteSite(siteId: string): Promise<{ ok: true } | { ok: false; error: "notFound" }> {
  const me = await requireUser();
  if (!(await findOwnedSite(siteId, me.id))) return { ok: false, error: "notFound" };
  await db.delete(site).where(inArray(site.id, [siteId]));
  return { ok: true };
}
