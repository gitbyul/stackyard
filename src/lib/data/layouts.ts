import "server-only";

import { and, asc, eq, inArray } from "drizzle-orm";
import { notFound } from "next/navigation";

import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { layout, project, site } from "@/lib/db/schema";
import { palletPositions } from "@/lib/layout/model";

/** Layouts the user owns, with site context and headline numbers. */
export async function listLayouts() {
  const user = await requireUser();
  const rows = await db
    .select({
      id: layout.id,
      name: layout.name,
      floorWidth: layout.floorWidth,
      floorDepth: layout.floorDepth,
      doc: layout.doc,
      updatedAt: layout.updatedAt,
      siteName: site.name,
      city: site.city,
      projectName: project.name,
      client: project.client,
    })
    .from(layout)
    .innerJoin(site, eq(layout.siteId, site.id))
    .innerJoin(project, eq(site.projectId, project.id))
    .where(eq(project.ownerId, user.id))
    .orderBy(asc(project.startedOn), asc(site.name));

  return rows.map(({ doc, ...r }) => ({
    ...r,
    rowCount: doc.rows.length,
    positions: doc.rows.reduce((sum, row) => sum + palletPositions(row), 0),
  }));
}

/** One layout with what the editor needs from its site. 404s if not the user's. */
export async function getLayout(layoutId: string) {
  const user = await requireUser();
  const [row] = await db
    .select({
      id: layout.id,
      name: layout.name,
      floorWidth: layout.floorWidth,
      floorDepth: layout.floorDepth,
      doc: layout.doc,
      updatedAt: layout.updatedAt,
      siteId: site.id,
      siteName: site.name,
      clearHeight: site.clearHeight,
      dockDoors: site.dockDoors,
      projectId: project.id,
      projectName: project.name,
    })
    .from(layout)
    .innerJoin(site, eq(layout.siteId, site.id))
    .innerJoin(project, eq(site.projectId, project.id))
    .where(and(eq(layout.id, layoutId), eq(project.ownerId, user.id)));
  if (!row) notFound();
  return row;
}

/**
 * First layout id per site, so other pages can link into the studio. Callers
 * pass site ids they already loaded through an ownership-checked query.
 */
export async function layoutIdsBySite(siteIds: string[]) {
  if (siteIds.length === 0) return new Map<string, string>();
  const rows = await db
    .select({ id: layout.id, siteId: layout.siteId })
    .from(layout)
    .where(inArray(layout.siteId, siteIds))
    .orderBy(asc(layout.createdAt));
  // First layout per site wins.
  return new Map(rows.toReversed().map((r) => [r.siteId, r.id]));
}
