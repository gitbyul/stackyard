/**
 * Warehouse processes tracked for labour productivity, each with its own
 * unit of work. Rates are "units per labour hour".
 */
export const PROCESSES = ["receiving", "putaway", "picking", "packing", "shipping"] as const;
export type Process = (typeof PROCESSES)[number];

export const PROCESS_INFO: Record<Process, { label: string; unit: string; unitShort: string }> = {
  receiving: { label: "Receiving", unit: "pallets received", unitShort: "pallets" },
  putaway: { label: "Put-away", unit: "pallets stored", unitShort: "pallets" },
  picking: { label: "Picking", unit: "order lines", unitShort: "lines" },
  packing: { label: "Packing", unit: "orders packed", unitShort: "orders" },
  shipping: { label: "Shipping", unit: "pallets loaded", unitShort: "pallets" },
};

/**
 * Reference rates (units per labour hour) by industry. These are
 * illustrative figures for the demo, not published benchmarks.
 */
export const BENCHMARKS: Record<string, Record<Process, number>> = {
  "Food & Grocery": { receiving: 32, putaway: 22, picking: 110, packing: 45, shipping: 30 },
  Fashion: { receiving: 28, putaway: 20, picking: 150, packing: 60, shipping: 26 },
  "Automotive Aftermarket": { receiving: 24, putaway: 16, picking: 70, packing: 35, shipping: 22 },
};

export const DEFAULT_BENCHMARK: Record<Process, number> = {
  receiving: 28,
  putaway: 20,
  picking: 100,
  packing: 45,
  shipping: 26,
};

export function benchmarkFor(industry: string): Record<Process, number> {
  return BENCHMARKS[industry] ?? DEFAULT_BENCHMARK;
}
