/**
 * Fictional sample data for the public demo account. Every company, site
 * and product here is made up. Pure and deterministic: the same owner id
 * always yields the same rows (fixed PRNG seed and id sequence), so the
 * seed script and the daily demo reset produce identical data.
 */
import type * as s from "@/lib/db/schema";
import { generateRackField } from "@/lib/layout/generate";
import { floorFromArea } from "@/lib/layout/model";
import { currentStateTemplate } from "@/lib/process-map/template";
import { benchmarkFor, PROCESSES } from "@/lib/productivity/benchmarks";

const PROJECTS = [
  {
    code: "PRJ-2401",
    name: "Northwind Fresh DC Redesign",
    client: "Northwind Grocers",
    industry: "Food & Grocery",
    status: "design",
    summary: "Consolidate two chilled DCs into one high-bay site with a pick tower.",
    startedOn: "2026-03-04",
    sites: [
      { name: "Riverside DC", city: "Incheon", floorArea: 24000, clearHeight: 12, dockDoors: 32 },
      { name: "Eastgate Annex", city: "Pyeongtaek", floorArea: 9500, clearHeight: 9, dockDoors: 12 },
    ],
    categories: ["Dairy", "Produce", "Frozen", "Bakery", "Beverages"],
  },
  {
    code: "PRJ-2407",
    name: "Lumen Apparel E-commerce Hub",
    client: "Lumen Apparel",
    industry: "Fashion",
    status: "analysis",
    summary: "Size a mezzanine pick module for 3× growth in single-unit orders.",
    startedOn: "2026-06-17",
    sites: [{ name: "Harbor Fulfillment", city: "Busan", floorArea: 18000, clearHeight: 10.5, dockDoors: 18 }],
    categories: ["Tops", "Bottoms", "Outerwear", "Footwear", "Accessories"],
  },
  {
    code: "PRJ-2412",
    name: "Cobalt Parts Service Center",
    client: "Cobalt Mobility",
    industry: "Automotive Aftermarket",
    status: "discovery",
    summary: "Re-slot a spare-parts warehouse by velocity and part size.",
    startedOn: "2026-09-29",
    sites: [{ name: "Midland Parts Center", city: "Daejeon", floorArea: 12500, clearHeight: 11, dockDoors: 10 }],
    categories: ["Filters", "Brakes", "Electrical", "Body Panels", "Fluids"],
  },
] as const;

/** Project codes the sample data uses; the reset frees them before re-inserting. */
export const SAMPLE_PROJECT_CODES = PROJECTS.map((p) => p.code);

const NOUNS = ["Pack", "Box", "Set", "Kit", "Case", "Unit", "Bundle"];
const ADJ = ["Classic", "Prime", "Lite", "Max", "Eco", "Pro", "Mini", "Bulk"];
const DAYS = 90;
const SKUS_PER_SITE = 140;
const END_DATE = new Date("2026-11-15");

/* Deterministic PRNG so every run produces the same dataset. */
function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export type SampleData = {
  projects: (typeof s.project.$inferInsert)[];
  sites: (typeof s.site.$inferInsert)[];
  processMaps: (typeof s.processMap.$inferInsert)[];
  processMapVersions: (typeof s.processMapVersion.$inferInsert)[];
  layouts: (typeof s.layout.$inferInsert)[];
  skus: (typeof s.sku.$inferInsert)[];
  orderLines: (typeof s.orderLine.$inferInsert)[];
  laborLogs: (typeof s.laborLog.$inferInsert)[];
};

/**
 * `idTag` is added to every generated id so a fresh copy can be staged next
 * to the current one (the daily reset); the data itself is unchanged.
 */
export function buildSampleData(ownerId: string, { idTag = "" }: { idTag?: string } = {}): SampleData {
  const rand = mulberry32(20261124);
  const pick = <T>(xs: readonly T[]) => xs[Math.floor(rand() * xs.length)];
  const between = (lo: number, hi: number) => Math.round(lo + rand() * (hi - lo));
  let idSeq = 0;
  const id = (prefix: string) => `${prefix}_${idTag}${(++idSeq).toString(36).padStart(6, "0")}`;

  const out: SampleData = {
    projects: [],
    sites: [],
    processMaps: [],
    processMapVersions: [],
    layouts: [],
    skus: [],
    orderLines: [],
    laborLogs: [],
  };

  /**
   * Labour records per day, shift and process. Volumes come from the day's
   * outbound work; rates are the industry reference scaled by a per-site
   * factor, a gentle trend over the period, a night-shift penalty and noise.
   * Hours = volume ÷ rate, so productivity can be recomputed from the log.
   */
  const laborFor = (siteId: string, industry: string, lines: (typeof s.orderLine.$inferInsert)[]) => {
    const bench = benchmarkFor(industry);
    const siteFactor = Object.fromEntries(PROCESSES.map((pr) => [pr, 0.78 + rand() * 0.4]));
    const trendSlope = -0.08 + rand() * 0.24; // most sites improve a little

    const byDay = new Map<string, { lines: number; orders: Set<string>; units: number }>();
    for (const l of lines) {
      const d = byDay.get(l.shippedOn) ?? { lines: 0, orders: new Set<string>(), units: 0 };
      d.lines++;
      d.orders.add(l.orderNo);
      d.units += l.quantity;
      byDay.set(l.shippedOn, d);
    }

    const days = [...byDay.keys()].sort();
    days.forEach((day, i) => {
      const d = byDay.get(day)!;
      const pallets = Math.max(1, Math.ceil(d.units / 60));
      const inbound = Math.max(1, Math.round(pallets * (0.9 + rand() * 0.2)));
      const volume: Record<(typeof PROCESSES)[number], number> = {
        receiving: inbound,
        putaway: inbound,
        picking: d.lines,
        packing: d.orders.size,
        shipping: pallets,
      };
      const trend = 1 + trendSlope * (i / Math.max(1, days.length - 1) - 0.5);
      for (const shift of ["day", "night"] as const) {
        const share = shift === "day" ? 0.65 : 0.35;
        const shiftFactor = shift === "day" ? 1 : 0.9;
        for (const process of PROCESSES) {
          const v = Math.round(volume[process] * share);
          if (v === 0) continue;
          const rate = bench[process] * siteFactor[process] * trend * shiftFactor * (0.88 + rand() * 0.24);
          out.laborLogs.push({
            id: id("lab"),
            siteId,
            workDate: day,
            shift,
            process,
            volume: v,
            hours: Math.max(0.25, Math.round((v / rate) * 4) / 4),
          });
        }
      }
    });
  };

  for (const p of PROJECTS) {
    const projectId = id("prj");
    out.projects.push({
      id: projectId,
      code: p.code,
      name: p.name,
      client: p.client,
      industry: p.industry,
      status: p.status,
      summary: p.summary,
      startedOn: p.startedOn,
      ownerId,
    });

    for (const site of p.sites) {
      const siteId = id("site");
      out.sites.push({ id: siteId, projectId, ...site });

      // Current-state process map, saved as version 1.
      const mapId = id("map");
      out.processMaps.push({ id: mapId, siteId, name: `${site.name}: inbound to outbound` });
      out.processMapVersions.push({
        id: id("mapv"),
        mapId,
        number: 1,
        doc: currentStateTemplate(() => id("step")),
        note: "Current-state map from site walk",
        authorId: ownerId,
      });

      // Starting layout: the generator's conventional rack field for this site.
      const floor = floorFromArea(site.floorArea);
      const rows = generateRackField(floor, { clearHeight: site.clearHeight, id: () => id("row") });
      out.layouts.push({
        id: id("lay"),
        siteId,
        name: `${site.name}: base plan`,
        floorWidth: floor.width,
        floorDepth: floor.depth,
        doc: { version: 1, rows },
      });

      // SKUs with a Pareto-like demand weight: few fast movers, long tail.
      const skus = Array.from({ length: SKUS_PER_SITE }, (_, i) => {
        const category = pick(p.categories);
        return {
          row: {
            id: id("sku"),
            siteId,
            code: `${p.code.slice(4)}-${String(i + 1).padStart(4, "0")}`,
            name: `${pick(ADJ)} ${category} ${pick(NOUNS)}`,
            category,
            lengthMm: between(80, 600),
            widthMm: between(60, 400),
            heightMm: between(40, 350),
            weightKg: Math.round((0.1 + rand() * 18) * 10) / 10,
            unitsPerCase: pick([1, 4, 6, 12, 24, 48]),
          },
          weight: 1 / Math.pow(i + 1, 1.1),
        };
      });
      out.skus.push(...skus.map((k) => k.row));

      const totalWeight = skus.reduce((a, k) => a + k.weight, 0);
      const drawSku = () => {
        let r = rand() * totalWeight;
        for (const k of skus) if ((r -= k.weight) <= 0) return k.row;
        return skus[skus.length - 1].row;
      };

      const lines: (typeof s.orderLine.$inferInsert)[] = [];
      let orderSeq = 0;
      for (let d = DAYS - 1; d >= 0; d--) {
        const day = new Date(END_DATE);
        day.setDate(day.getDate() - d);
        if (day.getDay() === 0) continue; // closed on Sundays
        const shippedOn = day.toISOString().slice(0, 10);
        const orders = Math.round((site.dockDoors * 4 + between(0, 40)) * (day.getDay() === 1 ? 1.3 : 1));
        for (let o = 0; o < orders; o++) {
          const orderNo = `SO${shippedOn.replaceAll("-", "").slice(2)}${String(++orderSeq).padStart(5, "0")}`;
          const lineCount = 1 + Math.floor(Math.pow(rand(), 2) * 6);
          for (let l = 0; l < lineCount; l++) {
            const k = drawSku();
            lines.push({
              id: id("ol"),
              siteId,
              skuId: k.id,
              orderNo,
              shippedOn,
              quantity: rand() < 0.8 ? between(1, 6) : k.unitsPerCase * between(1, 3),
            });
          }
        }
      }
      out.orderLines.push(...lines);

      // Labour log derived from the same days' outbound work.
      laborFor(siteId, p.industry, lines);
    }
  }
  return out;
}
