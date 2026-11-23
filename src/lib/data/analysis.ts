import "server-only";

import { and, asc, count, countDistinct, eq, gte, lte, max, min, sql } from "drizzle-orm";

import type { SkuMovement } from "@/lib/analysis/abc";
import type { SkuDims } from "@/lib/slotting/sizing";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { orderLine, project, site, sku } from "@/lib/db/schema";

export const PERIODS = [30, 60, 90] as const;
export type PeriodDays = (typeof PERIODS)[number];

/** Sites the current user can analyse, for the site picker. */
export async function listAnalysableSites() {
  const user = await requireUser();
  return db
    .select({ id: site.id, name: site.name, projectName: project.name, client: project.client })
    .from(site)
    .innerJoin(project, eq(site.projectId, project.id))
    .where(eq(project.ownerId, user.id))
    .orderBy(asc(project.startedOn), asc(site.name));
}

function shiftDays(iso: string, days: number) {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/**
 * Per-SKU movement for one site over the last `days` days of its data.
 * The window ends at the site's latest shipment rather than today, so the
 * fixed sample dataset stays analysable as time passes. SKUs that didn't move
 * are included with zeros, along with case dimensions for space sizing.
 * Returns null if the site isn't the user's.
 */
export async function getSkuMovement(siteId: string, days: PeriodDays) {
  const user = await requireUser();

  const [owned] = await db
    .select({ id: site.id, name: site.name, projectId: project.id, projectName: project.name })
    .from(site)
    .innerJoin(project, eq(site.projectId, project.id))
    .where(and(eq(site.id, siteId), eq(project.ownerId, user.id)));
  if (!owned) return null;

  const [range] = await db
    .select({ first: min(orderLine.shippedOn), last: max(orderLine.shippedOn) })
    .from(orderLine)
    .where(eq(orderLine.siteId, siteId));

  if (!range?.last) {
    return { site: owned, from: null, to: null, orders: 0, rows: [] as (SkuMovement & SkuDims)[] };
  }

  const to = range.last;
  const from = shiftDays(to, -(days - 1));
  const inWindow = and(
    eq(orderLine.skuId, sku.id),
    gte(orderLine.shippedOn, from),
    lte(orderLine.shippedOn, to),
  );

  const [rows, [orders]] = await Promise.all([
    db
      .select({
        skuId: sku.id,
        code: sku.code,
        name: sku.name,
        category: sku.category,
        lengthMm: sku.lengthMm,
        widthMm: sku.widthMm,
        heightMm: sku.heightMm,
        unitsPerCase: sku.unitsPerCase,
        units: sql<number>`coalesce(sum(${orderLine.quantity}), 0)::int`,
        lines: count(orderLine.id),
        orders: countDistinct(orderLine.orderNo),
      })
      .from(sku)
      .leftJoin(orderLine, inWindow)
      .where(eq(sku.siteId, siteId))
      .groupBy(sku.id),
    db
      .select({ n: countDistinct(orderLine.orderNo) })
      .from(orderLine)
      .where(
        and(eq(orderLine.siteId, siteId), gte(orderLine.shippedOn, from), lte(orderLine.shippedOn, to)),
      ),
  ]);

  return {
    site: owned,
    from: range.first && range.first > from ? range.first : from,
    to,
    orders: orders.n,
    rows: rows.map((r) => ({ ...r, units: Number(r.units), lines: Number(r.lines), orders: Number(r.orders) })),
  };
}
