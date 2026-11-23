import "server-only";

import { and, asc, eq, gte, inArray, lte, max } from "drizzle-orm";

import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { laborLog, project, site } from "@/lib/db/schema";
import { benchmarkFor } from "@/lib/productivity/benchmarks";
import { summarize, type LaborRecord } from "@/lib/productivity/metrics";

function shiftDays(iso: string, days: number) {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/**
 * Labour records for the chosen site plus a per-site summary for every site
 * the user owns, over the last `days` days of each site's log (anchored to
 * the latest record, like the movement analysis).
 */
export async function getProductivity(siteId: string | undefined, days: number) {
  const user = await requireUser();
  const sites = await db
    .select({
      id: site.id,
      name: site.name,
      projectName: project.name,
      industry: project.industry,
    })
    .from(site)
    .innerJoin(project, eq(site.projectId, project.id))
    .where(eq(project.ownerId, user.id))
    .orderBy(asc(project.startedOn), asc(site.name));
  if (sites.length === 0) return null;

  const chosen = sites.find((s) => s.id === siteId) ?? sites[0];

  const lastBySite = await db
    .select({ siteId: laborLog.siteId, last: max(laborLog.workDate) })
    .from(laborLog)
    .where(
      inArray(
        laborLog.siteId,
        sites.map((s) => s.id),
      ),
    )
    .groupBy(laborLog.siteId);
  const last = new Map(lastBySite.map((r) => [r.siteId, r.last]));

  const load = async (id: string): Promise<{ from: string | null; to: string | null; records: LaborRecord[] }> => {
    const to = last.get(id);
    if (!to) return { from: null, to: null, records: [] };
    const from = shiftDays(to, -(days - 1));
    const records = await db
      .select({
        workDate: laborLog.workDate,
        shift: laborLog.shift,
        process: laborLog.process,
        hours: laborLog.hours,
        volume: laborLog.volume,
      })
      .from(laborLog)
      .where(and(eq(laborLog.siteId, id), gte(laborLog.workDate, from), lte(laborLog.workDate, to)));
    return { from, to, records };
  };

  const loaded = await Promise.all(sites.map(async (s) => ({ site: s, ...(await load(s.id)) })));
  const current = loaded.find((l) => l.site.id === chosen.id)!;

  return {
    sites,
    site: chosen,
    from: current.from,
    to: current.to,
    records: current.records,
    comparison: loaded.map((l) => ({
      site: l.site,
      summary: summarize(l.records, benchmarkFor(l.site.industry)),
    })),
  };
}
