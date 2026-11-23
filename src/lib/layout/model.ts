/**
 * Warehouse layout model. Units are metres. The floor spans x ∈ [0, width]
 * and z ∈ [0, depth]; dock doors sit on the front wall at z = depth.
 *
 * A rack row is a run of selective pallet-rack bays. Its (x, z) is the centre
 * of its footprint. With rotation 0 the bays run along x; with 90 along z.
 * Each bay holds two pallets per beam level.
 */
import { z } from "zod";

export const PALLETS_PER_BAY_LEVEL = 2;

export const rackRowSchema = z.object({
  id: z.string().min(1).max(64),
  name: z.string().min(1).max(32),
  x: z.number().finite(),
  z: z.number().finite(),
  rotation: z.union([z.literal(0), z.literal(90)]),
  bays: z.number().int().min(1).max(200),
  levels: z.number().int().min(1).max(12),
  bayWidth: z.number().min(1).max(5),
  depth: z.number().min(0.6).max(2),
  levelHeight: z.number().min(0.8).max(3),
});
export type RackRow = z.infer<typeof rackRowSchema>;

export const layoutDocSchema = z.object({
  version: z.literal(1),
  rows: z.array(rackRowSchema).max(2000),
});
export type LayoutDoc = z.infer<typeof layoutDocSchema>;

export type Floor = { width: number; depth: number };

export type Rect = { minX: number; maxX: number; minZ: number; maxZ: number };

/** Length of the row along its bays. */
export const rowLength = (r: Pick<RackRow, "bays" | "bayWidth">) => r.bays * r.bayWidth;

/** Axis-aligned footprint on the floor. */
export function rowRect(r: RackRow): Rect {
  const along = rowLength(r) / 2;
  const across = r.depth / 2;
  const [hx, hz] = r.rotation === 0 ? [along, across] : [across, along];
  return { minX: r.x - hx, maxX: r.x + hx, minZ: r.z - hz, maxZ: r.z + hz };
}

export const palletPositions = (r: RackRow) => r.bays * r.levels * PALLETS_PER_BAY_LEVEL;

/**
 * A plausible floor plan for a site of a given area: a 1.6 : 1 rectangle
 * (wider than deep), rounded to whole metres.
 */
export function floorFromArea(area: number): Floor {
  const width = Math.round(Math.sqrt(area * 1.6));
  return { width, depth: Math.round(area / width) };
}
