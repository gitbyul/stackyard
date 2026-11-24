"use server";

import { and, eq } from "drizzle-orm";

import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { layout, project, site } from "@/lib/db/schema";
import { layoutDocSchema, type LayoutDoc } from "@/lib/layout/model";

export type SaveResult = { ok: true; savedAt: string } | { ok: false; error: "invalid" | "notFound" };

export async function saveLayout(layoutId: string, doc: LayoutDoc): Promise<SaveResult> {
  const user = await requireUser();

  // Never trust the client payload: validate shape and bounds server-side.
  const parsed = layoutDocSchema.safeParse(doc);
  if (!parsed.success) return { ok: false, error: "invalid" };

  const [owned] = await db
    .select({ id: layout.id })
    .from(layout)
    .innerJoin(site, eq(layout.siteId, site.id))
    .innerJoin(project, eq(site.projectId, project.id))
    .where(and(eq(layout.id, layoutId), eq(project.ownerId, user.id)));
  if (!owned) return { ok: false, error: "notFound" };

  const savedAt = new Date();
  await db.update(layout).set({ doc: parsed.data, updatedAt: savedAt }).where(eq(layout.id, layoutId));
  return { ok: true, savedAt: savedAt.toISOString() };
}
