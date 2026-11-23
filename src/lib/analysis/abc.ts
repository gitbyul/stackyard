/**
 * ABC (Pareto) classification of SKUs by outbound movement.
 *
 * SKUs are ranked by the chosen metric, highest first. A SKU's class is decided
 * by the cumulative share *before* it is added, so the SKU that crosses the A
 * cut-off is still an A item. With the default 80 / 95 cut-offs:
 *   A: the SKUs that make up the first 80% of movement
 *   B: the next 15%
 *   C: the remaining 5%, plus every SKU that didn't move at all
 *
 * Pure and framework-free so it can be unit-tested and run on the client.
 */

export const ABC_CLASSES = ["A", "B", "C"] as const;
export type AbcClass = (typeof ABC_CLASSES)[number];

/** Units = pieces shipped. Lines = order lines (pick visits / "hits"). */
export type AbcMetric = "units" | "lines";

export type SkuMovement = {
  skuId: string;
  code: string;
  name: string;
  category: string;
  units: number;
  lines: number;
  orders: number;
};

export type AbcThresholds = {
  /** Cumulative share (0–1) where class A ends. */
  a: number;
  /** Cumulative share (0–1) where class B ends. Must be ≥ `a`. */
  b: number;
};

export const DEFAULT_THRESHOLDS: AbcThresholds = { a: 0.8, b: 0.95 };

export type AbcItem = SkuMovement & {
  rank: number;
  value: number;
  /** This SKU's share of the total (0–1). */
  share: number;
  /** Cumulative share up to and including this SKU (0–1). */
  cumShare: number;
  cls: AbcClass;
};

export type AbcClassSummary = {
  cls: AbcClass;
  skuCount: number;
  skuShare: number;
  value: number;
  valueShare: number;
};

export type AbcResult = {
  metric: AbcMetric;
  thresholds: AbcThresholds;
  total: number;
  items: AbcItem[];
  summary: AbcClassSummary[];
  /** SKUs with zero movement in the period (counted in class C). */
  idleCount: number;
};

export function classifyAbc(
  rows: readonly SkuMovement[],
  metric: AbcMetric,
  thresholds: AbcThresholds = DEFAULT_THRESHOLDS,
): AbcResult {
  if (!(thresholds.a > 0 && thresholds.a <= thresholds.b && thresholds.b <= 1)) {
    throw new RangeError(`Invalid ABC thresholds: a=${thresholds.a}, b=${thresholds.b}`);
  }

  // Highest movement first; ties broken by SKU code so results are stable.
  const sorted = [...rows].sort((x, y) => y[metric] - x[metric] || x.code.localeCompare(y.code));
  const total = sorted.reduce((sum, r) => sum + r[metric], 0);

  let running = 0;
  const items: AbcItem[] = sorted.map((row, i) => {
    const value = row[metric];
    const before = total > 0 ? running / total : 1;
    running += value;
    const cls: AbcClass =
      value === 0 ? "C" : before < thresholds.a ? "A" : before < thresholds.b ? "B" : "C";
    return {
      ...row,
      rank: i + 1,
      value,
      share: total > 0 ? value / total : 0,
      cumShare: total > 0 ? running / total : 0,
      cls,
    };
  });

  const summary = ABC_CLASSES.map((cls) => {
    const members = items.filter((it) => it.cls === cls);
    const value = members.reduce((sum, it) => sum + it.value, 0);
    return {
      cls,
      skuCount: members.length,
      skuShare: items.length > 0 ? members.length / items.length : 0,
      value,
      valueShare: total > 0 ? value / total : 0,
    };
  });

  return {
    metric,
    thresholds,
    total,
    items,
    summary,
    idleCount: items.filter((it) => it.value === 0).length,
  };
}

/**
 * Cross-tab of the units class (rows) against the lines class (columns).
 * `matrix[r][c]` counts SKUs; e.g. an A-units / C-lines SKU ships in bulk but
 * is rarely picked, which suggests pallet storage rather than a pick face.
 */
export function crossClassify(units: AbcResult, lines: AbcResult): number[][] {
  const lineClass = new Map(lines.items.map((it) => [it.skuId, it.cls]));
  const matrix = ABC_CLASSES.map(() => ABC_CLASSES.map(() => 0));
  for (const it of units.items) {
    const c = lineClass.get(it.skuId);
    if (!c) continue;
    matrix[ABC_CLASSES.indexOf(it.cls)][ABC_CLASSES.indexOf(c)]++;
  }
  return matrix;
}
