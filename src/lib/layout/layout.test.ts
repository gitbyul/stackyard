import { describe, expect, it } from "vitest";

import { generateRackField } from "./generate";
import { floorFromArea, palletPositions, rowRect, type RackRow } from "./model";
import { layoutStats } from "./stats";

const row = (over: Partial<RackRow> = {}): RackRow => ({
  id: "r1",
  name: "R01",
  x: 10,
  z: 10,
  rotation: 0,
  bays: 4,
  levels: 3,
  bayWidth: 2.5,
  depth: 1,
  levelHeight: 1.5,
  ...over,
});

describe("model", () => {
  it("computes the footprint for both rotations", () => {
    expect(rowRect(row())).toEqual({ minX: 5, maxX: 15, minZ: 9.5, maxZ: 10.5 });
    expect(rowRect(row({ rotation: 90 }))).toEqual({ minX: 9.5, maxX: 10.5, minZ: 5, maxZ: 15 });
  });

  it("counts two pallets per bay level", () => {
    expect(palletPositions(row())).toBe(4 * 3 * 2);
  });

  it("derives a 1.6:1 floor from an area", () => {
    expect(floorFromArea(10_000)).toEqual({ width: 126, depth: 79 });
  });
});

describe("generateRackField", () => {
  const floor = { width: 60, depth: 50 };

  it("fills the floor without overlaps or leaving the building", () => {
    const rows = generateRackField(floor, { clearHeight: 10 });
    expect(rows.length).toBeGreaterThan(0);
    expect(layoutStats(rows, floor).issues).toEqual([]);
  });

  it("keeps the dock staging zone free", () => {
    const rows = generateRackField(floor, { clearHeight: 10, dockZone: 18 });
    const deepest = Math.max(...rows.map((r) => rowRect(r).maxZ));
    expect(deepest).toBeLessThanOrEqual(floor.depth - 18);
  });

  it("starts with a wall row, then back-to-back pairs split by aisles", () => {
    const rows = generateRackField(floor, { clearHeight: 10, aisle: 3, flue: 0.3, rackDepth: 1, wallGap: 1 });
    const zs = rows.map((r) => r.z);
    // wall row at 1.5; pair at 5.5 / 6.8; next pair 3 m aisle later.
    expect(zs.slice(0, 3)).toEqual([1.5, 5.5, 6.8]);
    expect(zs[3] - zs[2]).toBeCloseTo(1 / 2 + 3 + 1 / 2);
  });

  it("splits long runs into two blocks with a cross aisle", () => {
    const wide = { width: 120, depth: 40 };
    const rows = generateRackField(wide, { clearHeight: 10, maxBlockLength: 70, crossAisle: 4 });
    const [a, b] = rows;
    expect(a.z).toBe(b.z);
    expect(rowRect(b).minX - rowRect(a).maxX).toBeGreaterThanOrEqual(4);
    expect(layoutStats(rows, wide).issues).toEqual([]);
  });

  it("derives beam levels from clear height", () => {
    expect(generateRackField(floor, { clearHeight: 12, levelHeight: 1.6 })[0].levels).toBe(6);
    expect(generateRackField(floor, { clearHeight: 2 })[0].levels).toBe(1);
  });

  it("returns nothing when the floor is too small", () => {
    expect(generateRackField({ width: 2, depth: 2 }, { clearHeight: 10 })).toEqual([]);
  });
});

describe("layoutStats", () => {
  const floor = { width: 100, depth: 100 };

  it("totals positions, footprint, coverage and density", () => {
    const s = layoutStats([row(), row({ id: "r2", z: 20 })], floor);
    expect(s.positions).toBe(48);
    expect(s.footprint).toBe(20);
    expect(s.coverage).toBeCloseTo(0.002);
    expect(s.density).toBeCloseTo(4.8);
  });

  it("flags overlapping rows but not rows that only touch", () => {
    const touching = layoutStats([row(), row({ id: "r2", z: 11 })], floor);
    expect(touching.issues).toEqual([]);
    const crossing = layoutStats([row(), row({ id: "r2", rotation: 90 })], floor);
    expect(crossing.issues).toEqual([{ kind: "overlap", rowIds: ["r1", "r2"] }]);
    expect(crossing.flagged).toEqual(new Set(["r1", "r2"]));
  });

  it("flags rows outside the building", () => {
    const s = layoutStats([row({ x: 2 })], floor);
    expect(s.issues).toEqual([{ kind: "outside", rowIds: ["r1"] }]);
  });
});
