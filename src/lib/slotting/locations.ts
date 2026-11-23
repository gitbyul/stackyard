import { dockPositions, rowLength, type Floor, type RackRow } from "@/lib/layout/model";

/**
 * One pallet position in the layout, with the travel cost to reach it.
 * World coordinates match how the studio draws pallet loads.
 */
export type Location = {
  /** Human-readable code: row-bay-level-side, e.g. "R05-03-2-L". */
  code: string;
  rowIndex: number;
  bay: number;
  level: number;
  side: -1 | 1;
  x: number;
  y: number;
  z: number;
  /** Estimated travel to the location and back, in metres-equivalent. */
  cost: number;
};

export type CostModel = {
  /** Metres of horizontal travel one metre of lift is worth (lifting is slower). */
  verticalWeight: number;
};

export const DEFAULT_COST: CostModel = { verticalWeight: 2 };

/**
 * Every pallet position in the layout with a travel cost: rectilinear
 * (aisle-following) distance from the nearest dock door, out and back,
 * plus a penalty for height. Lower cost = quicker to pick.
 */
export function enumerateLocations(
  rows: readonly RackRow[],
  floor: Floor,
  dockDoors: number,
  model: CostModel = DEFAULT_COST,
): Location[] {
  // With no doors, fall back to the middle of the front wall.
  const docks = dockPositions(floor, dockDoors);
  const doorXs = docks.length > 0 ? docks : [floor.width / 2];
  const out: Location[] = [];

  rows.forEach((r, rowIndex) => {
    const x0 = -rowLength(r) / 2;
    const [cos, sin] = r.rotation === 90 ? [0, 1] : [1, 0];
    for (let b = 0; b < r.bays; b++) {
      for (let level = 0; level < r.levels; level++) {
        for (const side of [-1, 1] as const) {
          const lx = x0 + (b + 0.5) * r.bayWidth + (side * r.bayWidth) / 4;
          // Rotate about y (same convention as three.js): x' = x cosθ, z' = -x sinθ.
          const x = r.x + lx * cos;
          const z = r.z - lx * sin;
          const y = level * r.levelHeight;
          const horizontal = Math.min(...doorXs.map((dx) => Math.abs(x - dx))) + Math.abs(floor.depth - z);
          out.push({
            code: `${r.name}-${String(b + 1).padStart(2, "0")}-${level}-${side < 0 ? "L" : "R"}`,
            rowIndex,
            bay: b,
            level,
            side,
            x,
            y,
            z,
            cost: 2 * horizontal + model.verticalWeight * y,
          });
        }
      }
    }
  });
  return out;
}
