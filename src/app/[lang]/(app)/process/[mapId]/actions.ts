"use server";

import { and, eq, max } from "drizzle-orm";

import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { processMap, processMapVersion, project, site } from "@/lib/db/schema";
import { mapDocSchema, type MapDoc } from "@/lib/process-map/model";

export type SavedVersion = {
  id: string;
  number: number;
  note: string;
  doc: MapDoc;
  createdAt: string;
  author: string | null;
};
export type SaveVersionResult =
  | { ok: true; version: SavedVersion }
  | { ok: false; error: "invalid" | "notFound" | "retry" };

/** Appends a new numbered version. Earlier versions are never modified. */
export async function saveMapVersion(mapId: string, doc: MapDoc, note: string): Promise<SaveVersionResult> {
  const me = await requireUser();

  const parsed = mapDocSchema.safeParse(doc);
  if (!parsed.success) return { ok: false, error: "invalid" };
  const cleanNote = note.trim().slice(0, 200);

  const [owned] = await db
    .select({ id: processMap.id })
    .from(processMap)
    .innerJoin(site, eq(processMap.siteId, site.id))
    .innerJoin(project, eq(site.projectId, project.id))
    .where(and(eq(processMap.id, mapId), eq(project.ownerId, me.id)));
  if (!owned) return { ok: false, error: "notFound" };

  // The unique (map, number) index rejects a concurrent save; retry once.
  for (let attempt = 0; attempt < 2; attempt++) {
    const [{ last }] = await db
      .select({ last: max(processMapVersion.number) })
      .from(processMapVersion)
      .where(eq(processMapVersion.mapId, mapId));
    const number = (last ?? 0) + 1;
    const id = `mapv_${crypto.randomUUID()}`;
    const createdAt = new Date();
    try {
      await db.insert(processMapVersion).values({
        id,
        mapId,
        number,
        doc: parsed.data,
        note: cleanNote,
        authorId: me.id,
        createdAt,
      });
      return {
        ok: true,
        version: { id, number, note: cleanNote, doc: parsed.data, createdAt: createdAt.toISOString(), author: me.name },
      };
    } catch (err) {
      if (attempt === 1) throw err;
    }
  }
  return { ok: false, error: "retry" };
}
