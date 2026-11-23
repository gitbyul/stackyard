import type { AbcClass } from "@/lib/analysis/abc";
import type { Floor, RackRow } from "@/lib/layout/model";
import { enumerateLocations, type Location } from "./locations";
import { positionsNeeded, type SkuDims } from "./sizing";
import { solveSlotting, type SlotResult, type SlotSku, type SlotStrategy } from "./solve";

export type SlottingRequest = {
  rows: RackRow[];
  floor: Floor;
  dockDoors: number;
  periodDays: number;
  coverDays: number;
  strategy: Exclude<SlotStrategy, "baseline">;
  skus: (SkuDims & { skuId: string; code: string; name: string; cls: AbcClass; units: number; lines: number })[];
};

export type SlottingResponse = {
  locations: Location[];
  plan: SlotResult;
  /** The same SKUs slotted by code in layout order, for comparison. */
  baseline: SlotResult;
};

/** Everything the slotting view needs, computed in one pass (runs in a Web Worker). */
export function runSlotting(req: SlottingRequest): SlottingResponse {
  const locations = enumerateLocations(req.rows, req.floor, req.dockDoors);
  const skus: SlotSku[] = req.skus.map((s) => ({
    skuId: s.skuId,
    code: s.code,
    name: s.name,
    cls: s.cls,
    lines: s.lines,
    units: s.units,
    positions: positionsNeeded(s, s.units, req.periodDays, req.coverDays),
  }));
  return {
    locations,
    plan: solveSlotting(skus, locations, req.strategy),
    baseline: solveSlotting(skus, locations, "baseline"),
  };
}
