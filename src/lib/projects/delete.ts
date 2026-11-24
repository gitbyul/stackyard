import { and, eq } from "drizzle-orm";

import type { Db } from "@/lib/db/client";
import { project } from "@/lib/db/schema";

/**
 * Deletes a project only if `ownerId` owns it. The FK cascades remove its
 * sites and everything under them (SKUs, order lines, labour logs, layouts,
 * process maps and their versions) in the same statement, so it is atomic.
 * Returns false when there was nothing of the owner's to delete.
 */
export async function deleteOwnedProject(db: Db, projectId: string, ownerId: string): Promise<boolean> {
  const removed = await db
    .delete(project)
    .where(and(eq(project.id, projectId), eq(project.ownerId, ownerId)))
    .returning({ id: project.id });
  return removed.length > 0;
}
