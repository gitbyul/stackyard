/**
 * Labour productivity against engineered standards.
 *
 * For each record, standard hours = volume ÷ benchmark rate: the time the
 * work "should" take. Performance index = standard hours ÷ actual hours, so
 * 1.0 means on benchmark, 1.1 means 10% faster. Summing standard and actual
 * hours before dividing weights every process and day by its workload.
 */
import { PROCESSES, type Process } from "./benchmarks";

export type LaborRecord = {
  workDate: string; // YYYY-MM-DD
  shift: "day" | "night";
  process: Process;
  hours: number;
  volume: number;
};

export type Status = "above" | "par" | "below";

/** ±5% around the benchmark counts as on par. */
export function statusOf(index: number): Status {
  if (index >= 1.05) return "above";
  if (index >= 0.95) return "par";
  return "below";
}

type Acc = { volume: number; hours: number; standard: number };
const empty = (): Acc => ({ volume: 0, hours: 0, standard: 0 });
const add = (acc: Acc, r: LaborRecord, bench: Record<Process, number>) => {
  acc.volume += r.volume;
  acc.hours += r.hours;
  acc.standard += r.volume / bench[r.process];
};
const indexOf = (a: Acc) => (a.hours > 0 ? a.standard / a.hours : 0);
const rateOf = (a: Acc) => (a.hours > 0 ? a.volume / a.hours : 0);

export type ProcessSummary = {
  process: Process;
  volume: number;
  hours: number;
  /** Units per labour hour. */
  rate: number;
  benchmark: number;
  index: number;
  status: Status;
  dayRate: number;
  nightRate: number;
};

export type Summary = {
  processes: ProcessSummary[];
  totalHours: number;
  /** Workload-weighted index across all processes. */
  overallIndex: number;
  /** Hours that would have been saved (positive) or lost (negative) vs. the benchmark. */
  hoursVsBenchmark: number;
};

export function summarize(records: readonly LaborRecord[], bench: Record<Process, number>): Summary {
  const all = empty();
  const per = Object.fromEntries(PROCESSES.map((p) => [p, { all: empty(), day: empty(), night: empty() }])) as Record<
    Process,
    { all: Acc; day: Acc; night: Acc }
  >;
  for (const r of records) {
    add(all, r, bench);
    add(per[r.process].all, r, bench);
    add(per[r.process][r.shift], r, bench);
  }
  const processes = PROCESSES.map((process) => {
    const p = per[process];
    const index = indexOf(p.all);
    return {
      process,
      volume: p.all.volume,
      hours: p.all.hours,
      rate: rateOf(p.all),
      benchmark: bench[process],
      index,
      status: statusOf(index),
      dayRate: rateOf(p.day),
      nightRate: rateOf(p.night),
    };
  });
  return {
    processes,
    totalHours: all.hours,
    overallIndex: indexOf(all),
    hoursVsBenchmark: all.hours - all.standard,
  };
}

/** Monday of the ISO week containing `iso` (YYYY-MM-DD, UTC). */
export function weekStart(iso: string): string {
  const d = new Date(`${iso}T00:00:00Z`);
  const offset = (d.getUTCDay() + 6) % 7; // Mon = 0 … Sun = 6
  d.setUTCDate(d.getUTCDate() - offset);
  return d.toISOString().slice(0, 10);
}

export type WeekPoint = { week: string } & Record<Process, number | null>;

/** Index per process per ISO week, oldest first. null when a week has no hours. */
export function weeklyIndex(records: readonly LaborRecord[], bench: Record<Process, number>): WeekPoint[] {
  const weeks = new Map<string, Record<Process, Acc>>();
  for (const r of records) {
    const w = weekStart(r.workDate);
    let row = weeks.get(w);
    if (!row) {
      row = Object.fromEntries(PROCESSES.map((p) => [p, empty()])) as Record<Process, Acc>;
      weeks.set(w, row);
    }
    add(row[r.process], r, bench);
  }
  return [...weeks.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([week, row]) => {
      const point = { week } as WeekPoint;
      for (const p of PROCESSES) point[p] = row[p].hours > 0 ? indexOf(row[p]) : null;
      return point;
    });
}
