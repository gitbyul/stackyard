import "server-only";

import { and, asc, count, eq, max, min, sql } from "drizzle-orm";

import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { laborLog, orderLine, project, site, sku } from "@/lib/db/schema";

/** Sites and projects the user owns, for the data page pickers. */
export async function getDataWorkspace() {
  const user = await requireUser();
  const [projects, sites] = await Promise.all([
    db
      .select({ id: project.id, name: project.name, code: project.code })
      .from(project)
      .where(eq(project.ownerId, user.id))
      .orderBy(asc(project.startedOn)),
    db
      .select({ id: site.id, name: site.name, city: site.city, projectId: site.projectId, projectName: project.name })
      .from(site)
      .innerJoin(project, eq(site.projectId, project.id))
      .where(eq(project.ownerId, user.id))
      .orderBy(asc(project.startedOn), asc(site.name)),
  ]);
  return { projects, sites };
}

/** Row counts and date coverage of each dataset for one site. */
export async function getDatasetSummary(siteId: string) {
  const [[skus], [lines], [labor]] = await Promise.all([
    db.select({ n: count() }).from(sku).where(eq(sku.siteId, siteId)),
    db
      .select({
        n: count(),
        from: min(orderLine.shippedOn),
        to: max(orderLine.shippedOn),
        units: sql<number>`coalesce(sum(${orderLine.quantity}), 0)::int`,
        orders: sql<number>`count(distinct ${orderLine.orderNo})::int`,
      })
      .from(orderLine)
      .where(eq(orderLine.siteId, siteId)),
    db
      .select({
        n: count(),
        from: min(laborLog.workDate),
        to: max(laborLog.workDate),
        hours: sql<number>`coalesce(sum(${laborLog.hours}), 0)::float`,
      })
      .from(laborLog)
      .where(eq(laborLog.siteId, siteId)),
  ]);
  return {
    skus: { rows: skus.n },
    orderLines: { rows: lines.n, from: lines.from, to: lines.to, units: lines.units, orders: lines.orders },
    laborLogs: { rows: labor.n, from: labor.from, to: labor.to, hours: labor.hours },
  };
}
export type DatasetSummary = Awaited<ReturnType<typeof getDatasetSummary>>;

/** The site if the user owns it, else null. */
export async function findOwnedSite(siteId: string, userId: string) {
  const [row] = await db
    .select({ id: site.id, name: site.name })
    .from(site)
    .innerJoin(project, eq(site.projectId, project.id))
    .where(and(eq(site.id, siteId), eq(project.ownerId, userId)));
  return row ?? null;
}
