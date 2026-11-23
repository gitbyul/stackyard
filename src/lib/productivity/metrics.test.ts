import { describe, expect, it } from "vitest";

import type { Process } from "./benchmarks";
import { statusOf, summarize, weekStart, weeklyIndex, type LaborRecord } from "./metrics";

const bench: Record<Process, number> = { receiving: 30, putaway: 20, picking: 100, packing: 50, shipping: 25 };

const rec = (over: Partial<LaborRecord>): LaborRecord => ({
  workDate: "2026-11-02",
  shift: "day",
  process: "picking",
  hours: 10,
  volume: 1000,
  ...over,
});

describe("statusOf", () => {
  it("treats ±5% as on par", () => {
    expect(statusOf(1.05)).toBe("above");
    expect(statusOf(1.0499)).toBe("par");
    expect(statusOf(0.95)).toBe("par");
    expect(statusOf(0.9499)).toBe("below");
  });
});

describe("summarize", () => {
  it("computes rate, index and shift rates per process", () => {
    const s = summarize(
      [rec({ hours: 8, volume: 960 }), rec({ shift: "night", hours: 4, volume: 360 })],
      bench,
    );
    const picking = s.processes.find((p) => p.process === "picking")!;
    expect(picking.rate).toBeCloseTo(1320 / 12);
    expect(picking.index).toBeCloseTo(1.1); // 13.2 standard h ÷ 12 actual h
    expect(picking.status).toBe("above");
    expect(picking.dayRate).toBeCloseTo(120);
    expect(picking.nightRate).toBeCloseTo(90);
  });

  it("weights the overall index by workload, not by process count", () => {
    // Picking: 10 std h in 10 h (1.0). Packing: 1 std h in 2 h (0.5).
    const s = summarize(
      [rec({ hours: 10, volume: 1000 }), rec({ process: "packing", hours: 2, volume: 50 })],
      bench,
    );
    expect(s.overallIndex).toBeCloseTo(11 / 12);
    expect(s.totalHours).toBe(12);
    expect(s.hoursVsBenchmark).toBeCloseTo(1); // 12 actual − 11 standard
  });

  it("reports zeros for processes with no records", () => {
    const s = summarize([rec({})], bench);
    const shipping = s.processes.find((p) => p.process === "shipping")!;
    expect(shipping).toMatchObject({ volume: 0, hours: 0, rate: 0, index: 0, benchmark: 25 });
  });
});

describe("weeks", () => {
  it("finds the Monday of a date's ISO week", () => {
    expect(weekStart("2026-11-02")).toBe("2026-11-02"); // Monday
    expect(weekStart("2026-11-08")).toBe("2026-11-02"); // Sunday
    expect(weekStart("2026-11-09")).toBe("2026-11-09");
  });

  it("builds a weekly index series, null where a process has no hours", () => {
    const series = weeklyIndex(
      [
        rec({ workDate: "2026-11-10", volume: 1200 }),
        rec({ workDate: "2026-11-03", volume: 900 }),
        rec({ workDate: "2026-11-04", process: "packing", hours: 1, volume: 50 }),
      ],
      bench,
    );
    expect(series.map((w) => w.week)).toEqual(["2026-11-02", "2026-11-09"]);
    expect(series[0].picking).toBeCloseTo(0.9);
    expect(series[0].packing).toBeCloseTo(1);
    expect(series[1].picking).toBeCloseTo(1.2);
    expect(series[1].packing).toBeNull();
  });
});
