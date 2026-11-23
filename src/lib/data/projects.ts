import "server-only";

import { and, count, countDistinct, eq, sql } from "drizzle-orm";
import { notFound } from "next/navigation";

import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { orderLine, project, site, sku } from "@/lib/db/schema";

/*
 * Data access layer: every query starts from the signed-in user, so pages
 * can't accidentally read another user's projects.
 */

export async function listProjects() {
  const user = await requireUser();
  return db
    .select({
      id: project.id,
      code: project.code,
      name: project.name,
      client: project.client,
      industry: project.industry,
      status: project.status,
      startedOn: project.startedOn,
      siteCount: countDistinct(site.id),
    })
    .from(project)
    .leftJoin(site, eq(site.projectId, project.id))
    .where(eq(project.ownerId, user.id))
    .groupBy(project.id)
    .orderBy(project.startedOn);
}

export async function getWorkspaceTotals() {
  const user = await requireUser();
  const owned = eq(project.ownerId, user.id);

  const [[projects], [sites], [skus], [lines]] = await Promise.all([
    db.select({ n: count() }).from(project).where(owned),
    db.select({ n: count() }).from(site).innerJoin(project, eq(site.projectId, project.id)).where(owned),
    db
      .select({ n: count() })
      .from(sku)
      .innerJoin(site, eq(sku.siteId, site.id))
      .innerJoin(project, eq(site.projectId, project.id))
      .where(owned),
    db
      .select({ n: count(), units: sql<number>`coalesce(sum(${orderLine.quantity}), 0)::int` })
      .from(orderLine)
      .innerJoin(site, eq(orderLine.siteId, site.id))
      .innerJoin(project, eq(site.projectId, project.id))
      .where(owned),
  ]);

  return {
    projects: projects.n,
    sites: sites.n,
    skus: skus.n,
    orderLines: lines.n,
    unitsShipped: lines.units,
  };
}

export async function getProject(projectId: string) {
  const user = await requireUser();
  const [row] = await db
    .select()
    .from(project)
    .where(and(eq(project.id, projectId), eq(project.ownerId, user.id)));
  if (!row) notFound();

  const sites = await db
    .select({
      id: site.id,
      name: site.name,
      city: site.city,
      floorArea: site.floorArea,
      clearHeight: site.clearHeight,
      dockDoors: site.dockDoors,
      skuCount: countDistinct(sku.id),
    })
    .from(site)
    .leftJoin(sku, eq(sku.siteId, site.id))
    .where(eq(site.projectId, projectId))
    .groupBy(site.id)
    .orderBy(site.name);

  return { ...row, sites };
}

export type ProjectStatus = (typeof project.status.enumValues)[number];
