import { count, eq } from "drizzle-orm";

import type { Db } from "@/lib/db/client";
import { laborLog, orderLine, project, site, sku } from "@/lib/db/schema";
import type { Usage } from "./limits";

/** What an account currently stores, in the units the limits are set in. */
export async function countUsage(db: Db, ownerId: string): Promise<Usage> {
  const owned = eq(project.ownerId, ownerId);
  const rowsIn = (table: typeof sku | typeof orderLine | typeof laborLog) =>
    db
      .select({ n: count() })
      .from(table)
      .innerJoin(site, eq(table.siteId, site.id))
      .innerJoin(project, eq(site.projectId, project.id))
      .where(owned);

  const [[projects], [sites], [skus], [lines], [logs]] = await Promise.all([
    db.select({ n: count() }).from(project).where(owned),
    db.select({ n: count() }).from(site).innerJoin(project, eq(site.projectId, project.id)).where(owned),
    rowsIn(sku),
    rowsIn(orderLine),
    rowsIn(laborLog),
  ]);
  return { projects: projects.n, sites: sites.n, rows: skus.n + lines.n + logs.n };
}
