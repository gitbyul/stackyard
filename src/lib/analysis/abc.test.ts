import { describe, expect, it } from "vitest";

import { classifyAbc, crossClassify, type SkuMovement } from "./abc";

function sku(code: string, units: number, lines = units): SkuMovement {
  return { skuId: `id-${code}`, code, name: code, category: "x", units, lines, orders: lines };
}

describe("classifyAbc", () => {
  it("ranks by the metric and assigns classes by cumulative share", () => {
    // Shares: 50, 25, 10, 8, 4, 2, 1 (= 100)
    const rows = [sku("g", 1), sku("a", 50), sku("c", 10), sku("b", 25), sku("e", 4), sku("d", 8), sku("f", 2)];
    const r = classifyAbc(rows, "units");

    expect(r.total).toBe(100);
    expect(r.items.map((i) => i.code)).toEqual(["a", "b", "c", "d", "e", "f", "g"]);
    // a: 0→50, b: 50→75, c: 75→85 (crosses 80, still A)
    // d: 85→93, e: 93→97 (crosses 95, still B), f: 97→99, g: 99→100
    expect(r.items.map((i) => i.cls)).toEqual(["A", "A", "A", "B", "B", "C", "C"]);
    expect(r.items.at(-1)?.cumShare).toBeCloseTo(1);
  });

  it("summarises SKU and value shares per class", () => {
    const r = classifyAbc([sku("a", 80), sku("b", 15), sku("c", 5)], "units");
    expect(r.summary).toEqual([
      { cls: "A", skuCount: 1, skuShare: 1 / 3, value: 80, valueShare: 0.8 },
      { cls: "B", skuCount: 1, skuShare: 1 / 3, value: 15, valueShare: 0.15 },
      { cls: "C", skuCount: 1, skuShare: 1 / 3, value: 5, valueShare: 0.05 },
    ]);
  });

  it("puts a SKU sitting exactly on a cut-off in the next class", () => {
    // After a: 80% exactly, so b starts at the A boundary and becomes B.
    const r = classifyAbc([sku("a", 80), sku("b", 20)], "units");
    expect(r.items.map((i) => i.cls)).toEqual(["A", "B"]);
  });

  it("classifies by order lines independently of units", () => {
    const rows = [sku("bulk", 1000, 2), sku("fast", 10, 98)];
    expect(classifyAbc(rows, "units").items[0].code).toBe("bulk");
    expect(classifyAbc(rows, "lines").items[0].code).toBe("fast");
  });

  it("breaks ties by SKU code for stable output", () => {
    const r = classifyAbc([sku("z", 5), sku("m", 5), sku("a", 5)], "units");
    expect(r.items.map((i) => i.code)).toEqual(["a", "m", "z"]);
  });

  it("sends idle SKUs to C and counts them", () => {
    const r = classifyAbc([sku("a", 10), sku("idle1", 0), sku("idle2", 0)], "units");
    expect(r.items.map((i) => i.cls)).toEqual(["A", "C", "C"]);
    expect(r.idleCount).toBe(2);
  });

  it("handles an empty period without dividing by zero", () => {
    const r = classifyAbc([sku("a", 0), sku("b", 0)], "units");
    expect(r.total).toBe(0);
    expect(r.items.every((i) => i.cls === "C" && i.share === 0)).toBe(true);
    expect(classifyAbc([], "units").summary.every((s) => s.skuCount === 0)).toBe(true);
  });

  it("respects custom thresholds", () => {
    const rows = [sku("a", 60), sku("b", 20), sku("c", 15), sku("d", 5)];
    // a: 0→60 (A), b: 60→80 (B), c: 80→95 (B), d: 95→100 (C)
    const r = classifyAbc(rows, "units", { a: 0.5, b: 0.9 });
    expect(r.items.map((i) => i.cls)).toEqual(["A", "B", "B", "C"]);
  });

  it("rejects thresholds out of order", () => {
    expect(() => classifyAbc([], "units", { a: 0.9, b: 0.8 })).toThrow(RangeError);
  });
});

describe("crossClassify", () => {
  it("cross-tabs units class against lines class", () => {
    const rows = [sku("bulk", 900, 1), sku("fast", 50, 90), sku("slow", 50, 9)];
    const m = crossClassify(classifyAbc(rows, "units"), classifyAbc(rows, "lines"));
    // bulk: A units / C lines, fast: B / A, slow: C / B
    expect(m).toEqual([
      [0, 0, 1],
      [1, 0, 0],
      [0, 1, 0],
    ]);
  });
});
