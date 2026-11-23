import type { Floor, RackRow } from "./model";

export type GenerateOptions = {
  /** Clear height of the building; decides how many beam levels fit. */
  clearHeight: number;
  /** Working aisle between rows (reach-truck ≈ 3.0 m, counterbalance ≈ 3.6 m). */
  aisle?: number;
  /** Staging depth kept free in front of the dock doors. */
  dockZone?: number;
  /** Gap between back-to-back rows. */
  flue?: number;
  /** Clearance from walls. */
  wallGap?: number;
  /** Width of the cross aisle that splits long blocks. */
  crossAisle?: number;
  /** Rows longer than this are split into two blocks by a cross aisle. */
  maxBlockLength?: number;
  bayWidth?: number;
  rackDepth?: number;
  levelHeight?: number;
  /** Id factory; defaults to a counter so output is deterministic. */
  id?: (n: number) => string;
};

const DEFAULTS = {
  aisle: 3.2,
  dockZone: 18,
  flue: 0.3,
  wallGap: 1,
  crossAisle: 4,
  maxBlockLength: 70,
  bayWidth: 2.7,
  rackDepth: 1.1,
  levelHeight: 1.6,
};

const round = (v: number) => Math.round(v * 100) / 100;

/**
 * Fills the floor with a conventional selective pallet-rack layout:
 * a single row against the back wall, then back-to-back pairs separated by
 * working aisles, stopping short of the dock staging zone. Long runs are
 * split into two blocks by a cross aisle.
 */
export function generateRackField(floor: Floor, options: GenerateOptions): RackRow[] {
  const o = { ...DEFAULTS, ...options };
  const id = options.id ?? ((n: number) => `row-${n}`);
  const levels = Math.max(1, Math.min(8, Math.floor((o.clearHeight - 1) / o.levelHeight)));

  // Blocks along x.
  const usableX = floor.width - 2 * o.wallGap;
  const split = usableX > o.maxBlockLength;
  const blockLen = split ? (usableX - o.crossAisle) / 2 : usableX;
  const bays = Math.floor(blockLen / o.bayWidth);
  if (bays < 1) return [];
  const blockCentres = split
    ? [o.wallGap + blockLen / 2, floor.width - o.wallGap - blockLen / 2]
    : [floor.width / 2];

  // Row centre lines along z: single row, then pairs, each followed by an aisle.
  const zLimit = floor.depth - o.dockZone;
  const centres: number[] = [];
  let z = o.wallGap;
  if (z + o.rackDepth <= zLimit) {
    centres.push(z + o.rackDepth / 2);
    z += o.rackDepth + o.aisle;
  }
  while (z + 2 * o.rackDepth + o.flue <= zLimit) {
    centres.push(z + o.rackDepth / 2, z + o.rackDepth + o.flue + o.rackDepth / 2);
    z += 2 * o.rackDepth + o.flue + o.aisle;
  }

  const rows: RackRow[] = [];
  for (const cz of centres) {
    for (const cx of blockCentres) {
      const n = rows.length + 1;
      rows.push({
        id: id(n),
        name: `R${String(n).padStart(2, "0")}`,
        x: round(cx),
        z: round(cz),
        rotation: 0,
        bays,
        levels,
        bayWidth: o.bayWidth,
        depth: o.rackDepth,
        levelHeight: o.levelHeight,
      });
    }
  }
  return rows;
}
