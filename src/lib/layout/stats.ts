import { palletPositions, rowRect, type Floor, type RackRow, type Rect } from "./model";

const EPS = 0.01;

function overlaps(a: Rect, b: Rect) {
  return a.minX < b.maxX - EPS && b.minX < a.maxX - EPS && a.minZ < b.maxZ - EPS && b.minZ < a.maxZ - EPS;
}

function inside(r: Rect, floor: Floor) {
  return r.minX >= -EPS && r.minZ >= -EPS && r.maxX <= floor.width + EPS && r.maxZ <= floor.depth + EPS;
}

export type LayoutIssue =
  | { kind: "overlap"; rowIds: [string, string] }
  | { kind: "outside"; rowIds: [string] };

export type LayoutStats = {
  rows: number;
  bays: number;
  positions: number;
  /** Floor covered by racking, m². */
  footprint: number;
  /** footprint / floor area (0–1). */
  coverage: number;
  /** Pallet positions per 1,000 m² of floor. */
  density: number;
  issues: LayoutIssue[];
  /** Ids of rows involved in any issue, for highlighting. */
  flagged: Set<string>;
};

/**
 * Totals and validation for a layout. Overlap checks use a sweep along x
 * so large layouts stay fast (O(n log n) + overlapping candidates).
 */
export function layoutStats(rows: readonly RackRow[], floor: Floor): LayoutStats {
  const rects = rows.map((r) => ({ id: r.id, rect: rowRect(r) }));
  const issues: LayoutIssue[] = [];

  for (const { id, rect } of rects) {
    if (!inside(rect, floor)) issues.push({ kind: "outside", rowIds: [id] });
  }

  const sorted = [...rects].sort((a, b) => a.rect.minX - b.rect.minX);
  const active: typeof sorted = [];
  for (const cur of sorted) {
    for (let i = active.length - 1; i >= 0; i--) {
      if (active[i].rect.maxX <= cur.rect.minX + EPS) active.splice(i, 1);
    }
    for (const other of active) {
      if (overlaps(cur.rect, other.rect)) issues.push({ kind: "overlap", rowIds: [other.id, cur.id] });
    }
    active.push(cur);
  }

  const footprint = rects.reduce(
    (sum, { rect }) => sum + (rect.maxX - rect.minX) * (rect.maxZ - rect.minZ),
    0,
  );
  const area = floor.width * floor.depth;
  const positions = rows.reduce((sum, r) => sum + palletPositions(r), 0);

  return {
    rows: rows.length,
    bays: rows.reduce((sum, r) => sum + r.bays, 0),
    positions,
    footprint,
    coverage: area > 0 ? footprint / area : 0,
    density: area > 0 ? (positions / area) * 1000 : 0,
    issues,
    flagged: new Set(issues.flatMap((i) => i.rowIds)),
  };
}
