import "server-only";

import { and, asc, desc, eq, inArray } from "drizzle-orm";
import { notFound } from "next/navigation";

import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { processMap, processMapVersion, project, site, user } from "@/lib/db/schema";
import { analyzeFlow } from "@/lib/process-map/analyze";

const HISTORY_LIMIT = 50;

/** Maps the user owns with headline numbers from each map's latest version. */
export async function listProcessMaps() {
  const me = await requireUser();
  const maps = await db
    .select({
      id: processMap.id,
      name: processMap.name,
      siteName: site.name,
      projectName: project.name,
    })
    .from(processMap)
    .innerJoin(site, eq(processMap.siteId, site.id))
    .innerJoin(project, eq(site.projectId, project.id))
    .where(eq(project.ownerId, me.id))
    .orderBy(asc(project.startedOn), asc(site.name));
  if (maps.length === 0) return [];

  const versions = await db
    .select({
      mapId: processMapVersion.mapId,
      number: processMapVersion.number,
      doc: processMapVersion.doc,
      createdAt: processMapVersion.createdAt,
    })
    .from(processMapVersion)
    .where(
      inArray(
        processMapVersion.mapId,
        maps.map((m) => m.id),
      ),
    )
    .orderBy(desc(processMapVersion.number));
  const latest = new Map<string, (typeof versions)[number]>();
  for (const v of versions) if (!latest.has(v.mapId)) latest.set(v.mapId, v);

  return maps.map((m) => {
    const v = latest.get(m.id);
    const a = v ? analyzeFlow(v.doc) : null;
    return {
      ...m,
      version: v?.number ?? 0,
      updatedAt: v?.createdAt ?? null,
      steps: v?.doc.steps.length ?? 0,
      valueAddedRatio: a?.valueAddedRatio ?? 0,
      criticalMinutes: a?.criticalMinutes ?? 0,
    };
  });
}

/** One map with its recent history (newest first). 404s if not the user's. */
export async function getProcessMap(mapId: string) {
  const me = await requireUser();
  const [map] = await db
    .select({
      id: processMap.id,
      name: processMap.name,
      siteName: site.name,
      projectId: project.id,
      projectName: project.name,
    })
    .from(processMap)
    .innerJoin(site, eq(processMap.siteId, site.id))
    .innerJoin(project, eq(site.projectId, project.id))
    .where(and(eq(processMap.id, mapId), eq(project.ownerId, me.id)));
  if (!map) notFound();

  const versions = await db
    .select({
      id: processMapVersion.id,
      number: processMapVersion.number,
      note: processMapVersion.note,
      doc: processMapVersion.doc,
      createdAt: processMapVersion.createdAt,
      author: user.name,
    })
    .from(processMapVersion)
    .leftJoin(user, eq(processMapVersion.authorId, user.id))
    .where(eq(processMapVersion.mapId, mapId))
    .orderBy(desc(processMapVersion.number))
    .limit(HISTORY_LIMIT);

  return { ...map, versions };
}
