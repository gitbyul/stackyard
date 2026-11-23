"use client";

import { useState } from "react";
import { CartesianGrid, Line, LineChart, ReferenceLine, Tooltip, XAxis, YAxis } from "recharts";

import { Button } from "@/components/ui/button";
import { ChartContainer, type ChartConfig } from "@/components/ui/chart";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PROCESS_INFO, PROCESSES, type Process } from "@/lib/productivity/benchmarks";
import type { WeekPoint } from "@/lib/productivity/metrics";

/** Fixed categorical order; a process always keeps its colour. */
const COLOR: Record<Process, string> = {
  receiving: "var(--series-1)",
  putaway: "var(--series-2)",
  picking: "var(--series-3)",
  packing: "var(--series-4)",
  shipping: "var(--series-5)",
};

const config = Object.fromEntries(
  PROCESSES.map((p) => [p, { label: PROCESS_INFO[p].label, color: COLOR[p] }]),
) satisfies ChartConfig;

const weekLabel = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
const fmtWeek = (iso: string) => weekLabel.format(new Date(`${iso}T00:00:00Z`));
/** Index from a ratio (1.0 = benchmark), as in the weekly table. */
const fmtIndex = (v: number | null) => (v == null ? "–" : String(Math.round(v * 100)));
/** Chart rows are already scaled to 100 = benchmark. */
const fmtScaled = (v: number | null) => (v == null ? "–" : String(Math.round(v)));

type Row = { week: string } & Record<Process, number | null>;

function TrendTooltip({ active, payload }: { active?: boolean; payload?: { payload: Row }[] }) {
  const row = payload?.[0]?.payload;
  if (!active || !row) return null;
  return (
    <div className="min-w-44 rounded-md border bg-popover px-3 py-2 text-xs shadow-md">
      <p className="mb-1.5 text-muted-foreground">Week of {fmtWeek(row.week)}</p>
      <ul className="space-y-1">
        {PROCESSES.map((p) => (
          <li key={p} className="flex items-center justify-between gap-4">
            <span className="flex items-center gap-2 text-muted-foreground">
              <span className="h-0.5 w-3 rounded-full" style={{ background: COLOR[p] }} />
              {PROCESS_INFO[p].label}
            </span>
            <span className="font-semibold tabular-nums text-foreground">{fmtScaled(row[p])}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/**
 * Weekly performance index per process on one axis (benchmark = 100), so
 * processes with different units can share a chart without a second scale.
 */
export function TrendChart({ weeks }: { weeks: WeekPoint[] }) {
  const [showTable, setShowTable] = useState(false);
  const data = weeks.map((w) => {
    const row = { week: w.week } as Row;
    for (const p of PROCESSES) row[p] = w[p] == null ? null : w[p]! * 100;
    return row;
  });
  const values = data.flatMap((r) => PROCESSES.map((p) => r[p] ?? 100));
  const lo = Math.floor(Math.min(90, ...values) / 10) * 10;
  const hi = Math.ceil(Math.max(110, ...values) / 10) * 10;
  // Clean, evenly spaced ticks: every 10 points, or 20 for a wide range.
  const step = hi - lo > 80 ? 20 : 10;
  const ticks = Array.from({ length: Math.floor((hi - lo) / step) + 1 }, (_, i) => lo + i * step);

  return (
    <div className="space-y-3">
      <ChartContainer config={config} className="aspect-auto h-72 w-full">
        <LineChart data={data} margin={{ top: 8, right: 16, bottom: 4, left: 0 }}>
          <CartesianGrid vertical={false} />
          <XAxis dataKey="week" tickFormatter={fmtWeek} tickLine={false} axisLine={false} minTickGap={24} />
          <YAxis domain={[lo, hi]} ticks={ticks} tickLine={false} axisLine={false} width={40} className="tabular-nums" />
          <ReferenceLine
            y={100}
            stroke="var(--muted-foreground)"
            strokeDasharray="0"
            label={{ value: "Benchmark", position: "insideTopRight", fill: "var(--muted-foreground)", fontSize: 11 }}
          />
          <Tooltip
            cursor={{ stroke: "var(--muted-foreground)", strokeWidth: 1 }}
            content={<TrendTooltip />}
            isAnimationActive={false}
          />
          {PROCESSES.map((p) => (
            <Line
              key={p}
              dataKey={p}
              type="monotone"
              stroke={COLOR[p]}
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4, strokeWidth: 2, stroke: "var(--card)" }}
              connectNulls={false}
              isAnimationActive={false}
            />
          ))}
        </LineChart>
      </ChartContainer>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 pl-10 text-xs text-muted-foreground">
        {PROCESSES.map((p) => (
          <span key={p} className="flex items-center gap-1.5">
            <span className="h-0.5 w-3 rounded-full" style={{ background: COLOR[p] }} />
            {PROCESS_INFO[p].label}
          </span>
        ))}
        <Button variant="ghost" size="sm" className="ml-auto h-7" onClick={() => setShowTable((v) => !v)}>
          {showTable ? "Hide table" : "Show as table"}
        </Button>
      </div>
      {showTable && (
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Week of</TableHead>
                {PROCESSES.map((p) => (
                  <TableHead key={p} className="text-right">
                    {PROCESS_INFO[p].label}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {weeks.map((w) => (
                <TableRow key={w.week}>
                  <TableCell>{fmtWeek(w.week)}</TableCell>
                  {PROCESSES.map((p) => (
                    <TableCell key={p} className="text-right tabular-nums">
                      {fmtIndex(w[p])}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
