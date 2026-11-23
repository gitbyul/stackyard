import { describe, expect, it } from "vitest";

import type { RackRow } from "@/lib/layout/model";
import { enumerateLocations, type Location } from "./locations";
import { positionsNeeded, unitsPerPallet } from "./sizing";
import { solveSlotting, type SlotSku } from "./solve";

const row = (over: Partial<RackRow> = {}): RackRow => ({
  id: "r1",
  name: "R01",
  x: 10,
  z: 10,
  rotation: 0,
  bays: 2,
  levels: 2,
  bayWidth: 2,
  depth: 1,
  levelHeight: 1.5,
  ...over,
});

describe("enumerateLocations", () => {
  const floor = { width: 20, depth: 20 };

  it("creates two positions per bay level with readable codes", () => {
    const locs = enumerateLocations([row()], floor, 1);
    expect(locs).toHaveLength(2 * 2 * 2);
    expect(locs[0].code).toBe("R01-01-0-L");
    expect(locs.at(-1)!.code).toBe("R01-02-1-R");
  });

  it("matches the studio's pallet placement", () => {
    // Row centred at x=10, 4 m long: first bay centre 9, left load 8.5.
    const [first] = enumerateLocations([row()], floor, 1);
    expect(first).toMatchObject({ x: 8.5, y: 0, z: 10 });
    const rotated = enumerateLocations([row({ rotation: 90 })], floor, 1)[0];
    expect(rotated.x).toBeCloseTo(10);
    expect(rotated.z).toBeCloseTo(11.5);
  });

  it("costs nearer and lower positions less", () => {
    // One door at x=10 on the front wall (z=20).
    const near = enumerateLocations([row({ z: 18 })], floor, 1);
    const far = enumerateLocations([row({ z: 2 })], floor, 1);
    expect(near[0].cost).toBeLessThan(far[0].cost);
    const ground = near.find((l) => l.level === 0)!;
    const upper = near.find((l) => l.level === 1 && l.bay === ground.bay && l.side === ground.side)!;
    expect(upper.cost - ground.cost).toBeCloseTo(2 * 1.5);
  });
});

describe("sizing", () => {
  const dims = { lengthMm: 400, widthMm: 300, heightMm: 250, unitsPerCase: 6 };

  it("estimates units per pallet from case volume", () => {
    // 1.56e9 × 0.85 / 3e7 = 44 cases × 6 units
    expect(unitsPerPallet(dims)).toBe(44 * 6);
  });

  it("sizes positions for the cover period, at least one", () => {
    expect(positionsNeeded(dims, 0, 90, 10)).toBe(1);
    // 2,640 units/day × 10 days ÷ 264 per pallet = 100 → capped at 40
    expect(positionsNeeded(dims, 2640 * 90, 90, 10)).toBe(40);
    // 26.4 units/day × 10 days = exactly one pallet; one unit more needs two.
    expect(positionsNeeded(dims, 264 * 9, 90, 10)).toBe(1);
    expect(positionsNeeded(dims, 264 * 9 + 9, 90, 10)).toBe(2);
  });
});

describe("solveSlotting", () => {
  const loc = (cost: number, level = 0): Location => ({
    code: `L${cost}`,
    rowIndex: 0,
    bay: 0,
    level,
    side: -1,
    x: 0,
    y: 0,
    z: 0,
    cost,
  });
  const sku = (code: string, lines: number, positions = 1): SlotSku => ({
    skuId: code,
    code,
    name: code,
    cls: "A",
    lines,
    units: lines,
    positions,
  });

  // Layout order deliberately puts the expensive slots first.
  const locations = [loc(50), loc(40), loc(30), loc(20), loc(10, 2)];

  it("gives the lowest cube-per-order SKUs the cheapest positions", () => {
    // big: 2 positions / 100 lines = 0.02, small: 1 / 60 = 0.0167 → small first.
    const r = solveSlotting([sku("big", 100, 2), sku("small", 60)], locations, "coi");
    const byCode = Object.fromEntries(r.assignments.map((a) => [a.sku.code, a.locations]));
    expect(byCode.small).toEqual([4]);
    expect(byCode.big).toEqual([3, 2]);
  });

  it("ranks purely by pick lines for the velocity strategy", () => {
    const r = solveSlotting([sku("big", 100, 2), sku("small", 60)], locations, "velocity");
    expect(r.assignments[0].sku.code).toBe("big");
    expect(r.assignments[0].locations).toEqual([4, 3]);
  });

  it("beats the baseline on travel per pick", () => {
    const skus = [sku("a", 5), sku("b", 50), sku("c", 500)];
    const optimal = solveSlotting(skus, locations, "coi");
    const baseline = solveSlotting(skus, locations, "baseline");
    expect(baseline.assignments.map((a) => a.locations[0])).toEqual([0, 1, 2]);
    expect(optimal.travelPerPick).toBeLessThan(baseline.travelPerPick);
    // c (500 lines) at cost 10, b at 20, a at 30
    expect(optimal.travelPerPick).toBeCloseTo((500 * 10 + 50 * 20 + 5 * 30) / 555);
  });

  it("reports SKUs that don't fit and the positions used", () => {
    const r = solveSlotting([sku("a", 10, 3), sku("b", 5, 3)], locations, "coi");
    expect(r.unslotted.map((s) => s.code)).toEqual(["b"]);
    expect(r.positionsUsed).toBe(3);
    expect(r.positionsTotal).toBe(5);
  });

  it("measures the share of picks from the two lowest levels", () => {
    const r = solveSlotting([sku("hi", 30), sku("lo", 10)], locations, "velocity");
    // hi lands on the level-2 slot (cost 10), lo on level 0.
    expect(r.groundShare).toBeCloseTo(10 / 40);
  });
});
