import { STEP_KINDS, type Link, type MapDoc, type Step, type StepKind } from "./model";

export type FlowIssue =
  | { kind: "cycle"; stepIds: string[] }
  | { kind: "isolated"; stepIds: [string] }
  | { kind: "no-start" };

export type FlowAnalysis = {
  counts: Record<StepKind, number>;
  totalMinutes: number;
  valueAddedMinutes: number;
  /** Value-added time ÷ total time (lean "process cycle efficiency"). */
  valueAddedRatio: number;
  /** Longest path by minutes from a start step to an end step. */
  criticalPath: string[];
  criticalMinutes: number;
  /** Link ids along the critical path. */
  criticalLinks: string[];
  starts: string[];
  ends: string[];
  issues: FlowIssue[];
};

function adjacency(steps: readonly Step[], links: readonly Link[]) {
  const out = new Map<string, Link[]>(steps.map((s) => [s.id, []]));
  const indeg = new Map<string, number>(steps.map((s) => [s.id, 0]));
  for (const l of links) {
    if (!out.has(l.source) || !indeg.has(l.target)) continue;
    out.get(l.source)!.push(l);
    indeg.set(l.target, indeg.get(l.target)! + 1);
  }
  return { out, indeg };
}

/**
 * Kahn's algorithm. Returns the topological order of the acyclic part and
 * the ids left over, which all sit on or behind a cycle.
 */
export function topoOrder(steps: readonly Step[], links: readonly Link[]) {
  const { out, indeg } = adjacency(steps, links);
  const remaining = new Map(indeg);
  const queue = steps.filter((s) => remaining.get(s.id) === 0).map((s) => s.id);
  const order: string[] = [];
  while (queue.length) {
    const id = queue.shift()!;
    order.push(id);
    for (const l of out.get(id)!) {
      const n = remaining.get(l.target)! - 1;
      remaining.set(l.target, n);
      if (n === 0) queue.push(l.target);
    }
  }
  const cyclic = steps.map((s) => s.id).filter((id) => !order.includes(id));
  return { order, cyclic };
}

export function analyzeFlow(doc: Pick<MapDoc, "steps" | "links">): FlowAnalysis {
  const { steps, links } = doc;
  const byId = new Map(steps.map((s) => [s.id, s]));
  const { out, indeg } = adjacency(steps, links);
  const hasOut = (id: string) => out.get(id)!.length > 0;

  const counts = Object.fromEntries(STEP_KINDS.map((k) => [k, 0])) as Record<StepKind, number>;
  for (const s of steps) counts[s.kind]++;
  const totalMinutes = steps.reduce((sum, s) => sum + s.minutes, 0);
  const valueAddedMinutes = steps.filter((s) => s.valueAdded).reduce((sum, s) => sum + s.minutes, 0);

  const issues: FlowIssue[] = [];
  const isolated = steps.filter((s) => indeg.get(s.id) === 0 && !hasOut(s.id));
  if (steps.length > 1) for (const s of isolated) issues.push({ kind: "isolated", stepIds: [s.id] });

  const starts = steps.filter((s) => indeg.get(s.id) === 0 && (hasOut(s.id) || steps.length === 1)).map((s) => s.id);
  const ends = steps.filter((s) => !hasOut(s.id) && (indeg.get(s.id)! > 0 || steps.length === 1)).map((s) => s.id);
  if (steps.length > 0 && starts.length === 0) issues.push({ kind: "no-start" });

  const { order, cyclic } = topoOrder(steps, links);
  if (cyclic.length > 0) issues.push({ kind: "cycle", stepIds: cyclic });

  // Longest path over the acyclic part (DP in topological order).
  const best = new Map<string, { minutes: number; prev: string | null; via: string | null }>();
  for (const id of order) {
    const self = byId.get(id)!.minutes;
    if (!best.has(id)) best.set(id, { minutes: self, prev: null, via: null });
    const cur = best.get(id)!;
    for (const l of out.get(id)!) {
      if (cyclic.includes(l.target)) continue;
      const cand = cur.minutes + byId.get(l.target)!.minutes;
      const known = best.get(l.target);
      if (!known || cand > known.minutes) best.set(l.target, { minutes: cand, prev: id, via: l.id });
    }
  }

  let endId: string | null = null;
  for (const id of ends) {
    const b = best.get(id);
    if (b && (endId === null || b.minutes > best.get(endId)!.minutes)) endId = id;
  }
  const criticalPath: string[] = [];
  const criticalLinks: string[] = [];
  for (let id = endId; id; ) {
    criticalPath.unshift(id);
    const b = best.get(id)!;
    if (b.via) criticalLinks.unshift(b.via);
    id = b.prev;
  }

  return {
    counts,
    totalMinutes,
    valueAddedMinutes,
    valueAddedRatio: totalMinutes > 0 ? valueAddedMinutes / totalMinutes : 0,
    criticalPath,
    criticalMinutes: endId ? best.get(endId)!.minutes : 0,
    criticalLinks,
    starts,
    ends,
    issues,
  };
}

/**
 * Layered left-to-right layout: each step's column is its longest distance
 * from a start, rows follow the order steps appear in. Steps on a cycle are
 * placed in a column after everything else. Long flows wrap into bands of
 * `maxColumns` so a dock-to-dock chain stays readable on a normal screen.
 */
export function autoLayout(
  steps: readonly Step[],
  links: readonly Link[],
  {
    colGap = 240,
    rowGap = 130,
    maxColumns = 6,
    bandGap = 60,
  }: { colGap?: number; rowGap?: number; maxColumns?: number; bandGap?: number } = {},
): Step[] {
  const { order, cyclic } = topoOrder(steps, links);
  const { out } = adjacency(steps, links);
  const level = new Map<string, number>(order.map((id) => [id, 0]));
  for (const id of order) {
    for (const l of out.get(id)!) {
      if (level.has(l.target)) level.set(l.target, Math.max(level.get(l.target)!, level.get(id)! + 1));
    }
  }
  const lastLevel = Math.max(-1, ...level.values());
  for (const id of cyclic) level.set(id, lastLevel + 1);

  const rowsUsed = new Map<number, number>();
  const columns = new Map<number, string[]>();
  for (const s of steps) {
    const c = level.get(s.id)!;
    columns.set(c, [...(columns.get(c) ?? []), s.id]);
  }
  const tallest = Math.max(1, ...[...columns.values()].map((c) => c.length));

  const bandHeight = tallest * rowGap + bandGap;
  return steps.map((s) => {
    const c = level.get(s.id)!;
    const r = rowsUsed.get(c) ?? 0;
    rowsUsed.set(c, r + 1);
    // Centre each column vertically against the tallest one.
    const offset = ((tallest - columns.get(c)!.length) * rowGap) / 2;
    const band = Math.floor(c / maxColumns);
    return { ...s, x: (c % maxColumns) * colGap, y: band * bandHeight + offset + r * rowGap };
  });
}
