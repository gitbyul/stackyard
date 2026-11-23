/**
 * Dedicated-storage slotting: give each SKU its own pallet positions so that
 * frequently picked SKUs sit closest to the docks.
 *
 * The "coi" strategy uses the cube-per-order index: positions needed ÷ pick
 * lines. Assigning the lowest COI first to the cheapest locations minimises
 * expected travel for dedicated storage (Heskett, 1963), so a SKU that is
 * picked often but needs little space gets the best spots. "velocity" ranks by
 * pick lines only. "baseline" slots by SKU code into the layout in row order,
 * standing in for an unplanned warehouse to compare against.
 */
import type { AbcClass } from "@/lib/analysis/abc";
import type { Location } from "./locations";

export type SlotStrategy = "coi" | "velocity" | "baseline";

export type SlotSku = {
  skuId: string;
  code: string;
  name: string;
  cls: AbcClass;
  lines: number;
  units: number;
  positions: number;
};

export type Assignment = {
  sku: SlotSku;
  /** Indexes into the locations array. */
  locations: number[];
  /** Mean cost of this SKU's locations; picks are spread across them. */
  cost: number;
};

export type SlotResult = {
  strategy: SlotStrategy;
  assignments: Assignment[];
  /** SKUs that didn't fit because the layout ran out of positions. */
  unslotted: SlotSku[];
  positionsUsed: number;
  positionsTotal: number;
  /** Pick-line-weighted mean travel per pick, in metres. */
  travelPerPick: number;
  /** Share of pick lines served from levels 0–1 (no lift needed). */
  groundShare: number;
};

function order(skus: readonly SlotSku[], strategy: SlotStrategy) {
  const byCode = (a: SlotSku, b: SlotSku) => a.code.localeCompare(b.code);
  const list = [...skus];
  if (strategy === "baseline") return list.sort(byCode);
  if (strategy === "velocity") return list.sort((a, b) => b.lines - a.lines || byCode(a, b));
  // COI ascending; SKUs that never get picked go last.
  const coi = (s: SlotSku) => (s.lines > 0 ? s.positions / s.lines : Number.POSITIVE_INFINITY);
  return list.sort((a, b) => coi(a) - coi(b) || b.lines - a.lines || byCode(a, b));
}

export function solveSlotting(
  skus: readonly SlotSku[],
  locations: readonly Location[],
  strategy: SlotStrategy,
): SlotResult {
  // Location order: cheapest first, or plain layout order for the baseline.
  const slots = locations.map((_, i) => i);
  if (strategy !== "baseline") {
    slots.sort((a, b) => locations[a].cost - locations[b].cost || a - b);
  }

  const assignments: Assignment[] = [];
  const unslotted: SlotSku[] = [];
  let next = 0;
  for (const sku of order(skus, strategy)) {
    if (next + sku.positions > slots.length) {
      unslotted.push(sku);
      continue;
    }
    const mine = slots.slice(next, next + sku.positions);
    next += sku.positions;
    const cost = mine.reduce((sum, i) => sum + locations[i].cost, 0) / mine.length;
    assignments.push({ sku, locations: mine, cost });
  }

  const lines = assignments.reduce((sum, a) => sum + a.sku.lines, 0);
  const travel = assignments.reduce((sum, a) => sum + a.cost * a.sku.lines, 0);
  const ground = assignments.reduce((sum, a) => {
    const low = a.locations.filter((i) => locations[i].level <= 1).length / a.locations.length;
    return sum + low * a.sku.lines;
  }, 0);

  return {
    strategy,
    assignments,
    unslotted,
    positionsUsed: next,
    positionsTotal: locations.length,
    travelPerPick: lines > 0 ? travel / lines : 0,
    groundShare: lines > 0 ? ground / lines : 0,
  };
}
