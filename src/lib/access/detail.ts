import { and, eq, gt, sql } from "drizzle-orm";

import type { Db } from "@/lib/db/client";
import { layout, processMap, project, session, site } from "@/lib/db/schema";

/** Detail routes whose id must belong to the signed-in user. */
export const DETAIL_SECTIONS = ["projects", "studio", "process"] as const;
export type DetailSection = (typeof DETAIL_SECTIONS)[number];

export function isDetailSection(value: string | undefined): value is DetailSection {
  return (DETAIL_SECTIONS as readonly string[]).includes(value ?? "");
}

/**
 * Better Auth stores the session cookie as `<token>.<signature>`. The token is
 * a random secret, so matching it against a live session row is proof enough
 * here; the signature is checked again when the page loads the session.
 */
export function sessionTokenFromCookie(value: string | null | undefined): string | null {
  const token = value ? decodeURIComponent(value).split(".")[0] : "";
  return token.length > 0 ? token : null;
}

/**
 * True when the item behind a detail URL exists and belongs to the user of a
 * live session with this token. One indexed query (primary keys and the
 * unique session token), cheap enough to run before a page starts streaming
 * so a missing item can get a real 404 status.
 */
export async function canOpenDetail(db: Db, section: DetailSection, id: string, token: string): Promise<boolean> {
  const live = and(eq(session.token, token), gt(session.expiresAt, sql`now()`));
  const owner = eq(session.userId, project.ownerId);

  const query =
    section === "projects"
      ? db.select({ ok: sql<number>`1` }).from(project).innerJoin(session, owner).where(and(eq(project.id, id), live))
      : section === "studio"
        ? db
            .select({ ok: sql<number>`1` })
            .from(layout)
            .innerJoin(site, eq(layout.siteId, site.id))
            .innerJoin(project, eq(site.projectId, project.id))
            .innerJoin(session, owner)
            .where(and(eq(layout.id, id), live))
        : db
            .select({ ok: sql<number>`1` })
            .from(processMap)
            .innerJoin(site, eq(processMap.siteId, site.id))
            .innerJoin(project, eq(site.projectId, project.id))
            .innerJoin(session, owner)
            .where(and(eq(processMap.id, id), live));

  return (await query.limit(1)).length > 0;
}
