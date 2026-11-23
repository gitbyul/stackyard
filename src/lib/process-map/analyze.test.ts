import { describe, expect, it } from "vitest";

import { analyzeFlow, autoLayout, topoOrder } from "./analyze";
import { mapDocSchema, type Link, type Step } from "./model";

const step = (id: string, minutes: number, over: Partial<Step> = {}): Step => ({
  id,
  kind: "operation",
  label: id,
  x: 0,
  y: 0,
  minutes,
  valueAdded: true,
  process: null,
  role: "",
  ...over,
});
const link = (source: string, target: string): Link => ({ id: `${source}-${target}`, source, target, label: "" });

describe("analyzeFlow", () => {
  // a → b → d, a → c → d (c is the slower branch)
  const steps = [step("a", 2), step("b", 3), step("c", 10, { kind: "delay", valueAdded: false }), step("d", 1)];
  const links = [link("a", "b"), link("a", "c"), link("b", "d"), link("c", "d")];

  it("finds the longest path by minutes", () => {
    const r = analyzeFlow({ steps, links });
    expect(r.criticalPath).toEqual(["a", "c", "d"]);
    expect(r.criticalMinutes).toBe(13);
    expect(r.criticalLinks).toEqual(["a-c", "c-d"]);
    expect(r.starts).toEqual(["a"]);
    expect(r.ends).toEqual(["d"]);
  });

  it("counts steps and value-added time", () => {
    const r = analyzeFlow({ steps, links });
    expect(r.counts).toMatchObject({ operation: 3, delay: 1, storage: 0 });
    expect(r.totalMinutes).toBe(16);
    expect(r.valueAddedMinutes).toBe(6);
    expect(r.valueAddedRatio).toBeCloseTo(6 / 16);
    expect(r.issues).toEqual([]);
  });

  it("reports cycles and isolated steps", () => {
    const r = analyzeFlow({
      steps: [step("a", 1), step("b", 1), step("c", 1), step("lonely", 1)],
      links: [link("a", "b"), link("b", "c"), link("c", "b")],
    });
    expect(r.issues).toContainEqual({ kind: "cycle", stepIds: ["b", "c"] });
    expect(r.issues).toContainEqual({ kind: "isolated", stepIds: ["lonely"] });
  });

  it("reports a flow without a start", () => {
    const r = analyzeFlow({ steps: [step("a", 1), step("b", 1)], links: [link("a", "b"), link("b", "a")] });
    expect(r.issues).toContainEqual({ kind: "no-start" });
    expect(r.criticalPath).toEqual([]);
  });

  it("handles an empty map", () => {
    const r = analyzeFlow({ steps: [], links: [] });
    expect(r).toMatchObject({ totalMinutes: 0, valueAddedRatio: 0, criticalPath: [], issues: [] });
  });
});

describe("topoOrder", () => {
  it("orders steps so every link points forward", () => {
    const { order, cyclic } = topoOrder([step("c", 1), step("a", 1), step("b", 1)], [link("a", "b"), link("b", "c")]);
    expect(order).toEqual(["a", "b", "c"]);
    expect(cyclic).toEqual([]);
  });
});

describe("autoLayout", () => {
  it("puts each step in the column of its longest distance from a start", () => {
    const steps = [step("a", 1), step("b", 1), step("c", 1), step("d", 1)];
    const links = [link("a", "b"), link("b", "c"), link("a", "c"), link("c", "d")];
    const placed = Object.fromEntries(autoLayout(steps, links, { colGap: 100, rowGap: 50 }).map((s) => [s.id, s]));
    expect([placed.a.x, placed.b.x, placed.c.x, placed.d.x]).toEqual([0, 100, 200, 300]);
  });

  it("stacks parallel steps in the same column", () => {
    const steps = [step("a", 1), step("b", 1), step("c", 1)];
    const placed = autoLayout(steps, [link("a", "b"), link("a", "c")], { colGap: 100, rowGap: 50 });
    expect(placed.map((s) => [s.x, s.y])).toEqual([
      [0, 25],
      [100, 0],
      [100, 50],
    ]);
  });
});

describe("autoLayout wrapping", () => {
  it("wraps long chains into bands of maxColumns", () => {
    const ids = ["a", "b", "c", "d", "e"];
    const steps = ids.map((id) => step(id, 1));
    const links = ids.slice(1).map((id, i) => link(ids[i], id));
    const placed = autoLayout(steps, links, { colGap: 100, rowGap: 50, maxColumns: 2, bandGap: 10 });
    // band height = 1 row × 50 + 10
    expect(placed.map((s) => [s.x, s.y])).toEqual([
      [0, 0],
      [100, 0],
      [0, 60],
      [100, 60],
      [0, 120],
    ]);
  });
});

describe("mapDocSchema", () => {
  it("rejects links to missing steps and duplicate ids", () => {
    const base = { version: 1 as const, steps: [step("a", 1)], links: [] };
    expect(mapDocSchema.safeParse(base).success).toBe(true);
    expect(mapDocSchema.safeParse({ ...base, links: [link("a", "zzz")] }).success).toBe(false);
    expect(mapDocSchema.safeParse({ ...base, steps: [step("a", 1), step("a", 2)] }).success).toBe(false);
  });
});

describe("currentStateTemplate", () => {
  it("is a valid, acyclic map whose slowest path runs through the discrepancy hold", async () => {
    const { currentStateTemplate } = await import("./template");
    let n = 0;
    const doc = currentStateTemplate(() => `s${++n}`);
    expect(mapDocSchema.safeParse(doc).success).toBe(true);
    const r = analyzeFlow(doc);
    expect(r.issues).toEqual([]);
    const labels = r.criticalPath.map((id) => doc.steps.find((s) => s.id === id)!.label);
    expect(labels).toContain("Hold for discrepancy review");
    expect(r.valueAddedRatio).toBeGreaterThan(0);
    expect(r.valueAddedRatio).toBeLessThan(0.3);
  });
});
