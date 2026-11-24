"use client";

import { Area, AreaChart, CartesianGrid, ReferenceLine, Tooltip, XAxis, YAxis } from "recharts";

import { ChartContainer, type ChartConfig } from "@/components/ui/chart";
import { ABC_CLASSES, type AbcClass, type AbcItem, type AbcMetric } from "@/lib/analysis/abc";
import { fill, useI18n } from "@/i18n/client";
import { ABC_FILL } from "./abc-colors";

type Point = {
  skuPct: number;
  cum: number;
  rank: number;
  code?: string;
  name?: string;
  cls?: AbcClass;
} & Partial<Record<AbcClass, number>>;

const config = {
  A: { label: "A", color: ABC_FILL.A },
  B: { label: "B", color: ABC_FILL.B },
  C: { label: "C", color: ABC_FILL.C },
} satisfies ChartConfig;

/**
 * Cumulative movement curve. One y-scale (cumulative % of movement) over the
 * share of SKUs, ranked; each class is drawn as its own segment so the
 * boundary points are shared and the curve stays continuous.
 */
function toPoints(items: AbcItem[]): Point[] {
  const n = items.length;
  const points: Point[] = [{ skuPct: 0, cum: 0, rank: 0, A: 0 }];
  items.forEach((it, i) => {
    const p: Point = {
      skuPct: ((i + 1) / n) * 100,
      cum: it.cumShare * 100,
      rank: it.rank,
      code: it.code,
      name: it.name,
      cls: it.cls,
      [it.cls]: it.cumShare * 100,
    };
    const next = items[i + 1];
    if (next && next.cls !== it.cls) p[next.cls] = p.cum;
    points.push(p);
  });
  return points;
}

const pct = (v: number) => `${Math.round(v)}%`;

function ParetoTooltip({
  active,
  payload,
  metric,
}: {
  active?: boolean;
  payload?: { payload: Point }[];
  metric: AbcMetric;
}) {
  const { t: dict } = useI18n();
  const t = dict.analysis.chart;
  const p = payload?.[0]?.payload;
  if (!active || !p || !p.cls) return null;
  return (
    <div className="min-w-44 rounded-md border bg-popover px-3 py-2 text-xs shadow-md">
      <p className="text-base font-semibold tabular-nums text-foreground">{p.cum.toFixed(1)}%</p>
      <p className="text-muted-foreground">{fill(t.ofMetric, { metric: dict.analysis.metricLower[metric] })}</p>
      <div className="mt-2 flex items-center gap-2 border-t pt-2">
        <span className="h-0.5 w-3 rounded-full" style={{ background: ABC_FILL[p.cls] }} />
        <span className="font-medium text-foreground">
          {fill(t.topSkus, { n: p.rank, pct: p.skuPct.toFixed(0) })}
        </span>
      </div>
      <p className="mt-1 text-muted-foreground">
        {fill(t.point, { rank: p.rank, code: p.code ?? "", cls: p.cls })}
      </p>
    </div>
  );
}

export function ParetoChart({
  items,
  metric,
  thresholds,
}: {
  items: AbcItem[];
  metric: AbcMetric;
  thresholds: { a: number; b: number };
}) {
  const { t: dict } = useI18n();
  const t = dict.analysis.chart;
  const data = toPoints(items);
  return (
    <div className="space-y-3">
      <ChartContainer config={config} className="aspect-auto h-72 w-full">
        <AreaChart data={data} margin={{ top: 8, right: 16, bottom: 4, left: 0 }}>
          <CartesianGrid vertical={false} strokeDasharray="0" />
          <XAxis
            dataKey="skuPct"
            type="number"
            domain={[0, 100]}
            ticks={[0, 20, 40, 60, 80, 100]}
            tickFormatter={pct}
            tickLine={false}
            axisLine={false}
            className="tabular-nums"
          />
          <YAxis
            domain={[0, 100]}
            ticks={[0, 25, 50, 75, 100]}
            tickFormatter={pct}
            tickLine={false}
            axisLine={false}
            width={44}
            className="tabular-nums"
          />
          {[thresholds.a, thresholds.b].map((t) => (
            <ReferenceLine
              key={t}
              y={t * 100}
              stroke="var(--border)"
              label={{
                value: `${Math.round(t * 100)}%`,
                position: "insideBottomRight",
                fill: "var(--muted-foreground)",
                fontSize: 11,
              }}
            />
          ))}
          <Tooltip
            cursor={{ stroke: "var(--muted-foreground)", strokeWidth: 1 }}
            content={<ParetoTooltip metric={metric} />}
            isAnimationActive={false}
          />
          {ABC_CLASSES.map((cls) => (
            <Area
              key={cls}
              dataKey={cls}
              type="linear"
              stroke={ABC_FILL[cls]}
              strokeWidth={2}
              fill={ABC_FILL[cls]}
              fillOpacity={0.12}
              connectNulls={false}
              isAnimationActive={false}
              activeDot={{ r: 4, strokeWidth: 2, stroke: "var(--card)" }}
            />
          ))}
        </AreaChart>
      </ChartContainer>
      <div className="flex flex-wrap items-center gap-x-5 gap-y-1 pl-11 text-xs text-muted-foreground">
        {ABC_CLASSES.map((cls) => (
          <span key={cls} className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-sm" style={{ background: ABC_FILL[cls] }} />
            {fill(dict.common.classLabel, { cls })}
          </span>
        ))}
        <span className="ml-auto pr-4">{t.axes}</span>
      </div>
    </div>
  );
}
