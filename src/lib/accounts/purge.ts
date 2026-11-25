import { and, count, eq, inArray, ne } from "drizzle-orm";

import { runAtomic } from "@/lib/db/atomic";
import type { Db } from "@/lib/db/client";
import { project, user, verification } from "@/lib/db/schema";

export type PurgeSummary = { accounts: number; projects: number };

/**
 * Deletes every account except the one with `keepEmail` (the shared demo),
 * with everything tied to it (feature F-15). Deleting the user row cascades
 * to its projects and all their data (project.owner_id), its sessions and
 * its login methods; pending verifications for its email go in the same
 * atomic write. Throws if the account to keep doesn't exist, so a missing
 * demo user can never turn this into "delete everyone".
 */
export async function purgeAccounts(db: Db, keepEmail: string): Promise<PurgeSummary> {
  const [keep] = await db.select({ id: user.id }).from(user).where(eq(user.email, keepEmail));
  if (!keep) throw new Error("account to keep not found");

  const targets = await db.select({ id: user.id, email: user.email }).from(user).where(ne(user.id, keep.id));
  if (targets.length === 0) return { accounts: 0, projects: 0 };

  const ids = targets.map((t) => t.id);
  const [{ n: projects }] = await db.select({ n: count() }).from(project).where(inArray(project.ownerId, ids));

  await runAtomic(db, (q) => [
    q.delete(verification).where(inArray(verification.identifier, targets.map((t) => t.email))),
    q.delete(user).where(and(inArray(user.id, ids), ne(user.id, keep.id))),
  ]);
  return { accounts: targets.length, projects };
}
