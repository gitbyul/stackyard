import type { Metadata } from "next";
import { Suspense } from "react";

import { PageHeader } from "@/components/app/page-header";
import { ProductivityShell } from "@/components/productivity/productivity-filters";
import { StatusBadge } from "@/components/productivity/status-badge";
import { TrendChart } from "@/components/productivity/trend-chart";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getProductivity } from "@/lib/data/productivity";
import { fill } from "@/i18n/fill";
import { getDictionary, getLocale } from "@/i18n/server";
import { formatFor } from "@/lib/format";
import { benchmarkFor, PROCESSES } from "@/lib/productivity/benchmarks";
import { statusOf, summarize, weeklyIndex } from "@/lib/productivity/metrics";
import { cn } from "@/lib/utils";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getDictionary()).productivity.title };
}

export default async function ProductivityPage({ searchParams }: PageProps<"/[lang]/productivity">) {
  const t = (await getDictionary()).productivity;
  return (
    <>
      <PageHeader
        title={t.title}
        description={t.description}
      />
      <Suspense
        fallback={
          <div className="space-y-6 p-6">
            <Skeleton className="h-9 w-full max-w-xl" />
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-80 w-full" />
          </div>
        }
      >
        <Productivity searchParams={searchParams} />
      </Suspense>
    </>
  );
}

const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
const idx = (v: number) => Math.round(v * 100);

/**
 * Diverging cell shade around 100: blue above, red below, neutral near par.
 * Capped so the regular text colour stays readable; an arrow carries the
 * direction too, so colour is never the only cue.
 */
function divergingStyle(index: number) {
  const delta = Math.max(-0.3, Math.min(0.3, index - 1));
  if (Math.abs(delta) < 0.05) return { background: "var(--muted)" };
  const strength = Math.round((Math.abs(delta) / 0.3) * 40 + 8);
  const hue = delta > 0 ? "var(--diverging-up)" : "var(--diverging-down)";
  return { background: `color-mix(in oklab, ${hue} ${strength}%, var(--card))` };
}

async function Productivity({ searchParams }: Pick<PageProps<"/[lang]/productivity">, "searchParams">) {
  const sp = await searchParams;
  const periodParam = Number(one(sp.period));
  const period = [30, 60, 90].includes(periodParam) ? periodParam : 90;
  const data = await getProductivity(one(sp.site), period);
  const locale = await getLocale();
  const dict = await getDictionary(locale);
  const t = dict.productivity;
  const f = formatFor(locale);
  const rate = (v: number) => (v >= 100 ? f.number(Math.round(v)) : v.toFixed(1));
  const industry = (name: string) => dict.industries[name as keyof typeof dict.industries] ?? name;

  if (!data) {
    return <p className="p-6 text-sm text-muted-foreground">{t.noSites}</p>;
  }

  const bench = benchmarkFor(data.site.industry);
  const summary = summarize(data.records, bench);
  const weeks = weeklyIndex(data.records, bench);
  const overall = summary.overallIndex;
  const weakest = [...summary.processes].filter((p) => p.hours > 0).sort((a, b) => a.index - b.index)[0];
  const hrs = summary.hoursVsBenchmark;

  return (
    <ProductivityShell
      sites={data.sites.map((s) => ({ id: s.id, name: s.name, projectName: s.projectName }))}
      siteId={data.site.id}
      period={String(period)}
    >
      <div className="space-y-6 p-6">
        <p className="text-xs text-muted-foreground">
          {fill(t.context, { project: data.site.projectName, industry: industry(data.site.industry) })}
          {data.to && ` · ${f.date(data.from!)} – ${f.date(data.to)}`} · {t.illustrative}
        </p>

        {data.records.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t.noRecords}</p>
        ) : (
          <>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <Card className="gap-2">
                <CardHeader>
                  <CardDescription>{t.index}</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-5xl font-semibold tracking-tight">{idx(overall)}</p>
                  <p className="mt-2">
                    <StatusBadge status={statusOf(overall)} />
                    <span className="ml-2 text-xs text-muted-foreground">{t.indexNote}</span>
                  </p>
                </CardContent>
              </Card>
              <Stat label={t.hours} value={f.number(Math.round(summary.totalHours))} hint={t.hoursHint} />
              <Stat
                label={hrs > 0 ? t.over : t.saved}
                value={f.number(Math.round(Math.abs(hrs)))}
                hint={hrs > 0 ? fill(t.overHint, { pct: Math.round((hrs / summary.totalHours) * 100) }) : t.savedHint}
              />
              {weakest && (
                <Stat
                  label={t.gap}
                  value={dict.processes[weakest.process].label}
                  hint={fill(t.gapHint, {
                    index: idx(weakest.index),
                    rate: rate(weakest.rate),
                    ref: weakest.benchmark,
                    unit: dict.processes[weakest.process].unitShort,
                  })}
                />
              )}
            </div>

            <Card className="gap-0 py-0">
              <CardHeader className="pt-6">
                <CardTitle>{t.byProcess}</CardTitle>
                <CardDescription>{t.byProcessBody}</CardDescription>
              </CardHeader>
              <div className="mt-4 overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="pl-4">{t.table.process}</TableHead>
                      <TableHead className="text-right">{t.table.volume}</TableHead>
                      <TableHead className="text-right">{t.table.hours}</TableHead>
                      <TableHead className="text-right">{t.table.rate}</TableHead>
                      <TableHead className="text-right">{t.table.reference}</TableHead>
                      <TableHead className="text-right">{t.table.index}</TableHead>
                      <TableHead>{t.table.status}</TableHead>
                      <TableHead className="hidden text-right md:table-cell">{t.table.dayNight}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {summary.processes.map((p) => (
                      <TableRow key={p.process}>
                        <TableCell className="pl-4">
                          <div className="font-medium">{dict.processes[p.process].label}</div>
                          <div className="text-xs text-muted-foreground">{dict.processes[p.process].unit}</div>
                        </TableCell>
                        <TableCell className="text-right tabular-nums">{f.number(p.volume)}</TableCell>
                        <TableCell className="text-right tabular-nums">{f.number(Math.round(p.hours))}</TableCell>
                        <TableCell className="text-right font-medium tabular-nums">{rate(p.rate)}</TableCell>
                        <TableCell className="text-right tabular-nums text-muted-foreground">{p.benchmark}</TableCell>
                        <TableCell className="text-right font-semibold tabular-nums">{idx(p.index)}</TableCell>
                        <TableCell>
                          <StatusBadge status={p.status} />
                        </TableCell>
                        <TableCell className="hidden text-right tabular-nums text-muted-foreground md:table-cell">
                          {rate(p.dayRate)} / {rate(p.nightRate)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>{t.trendTitle}</CardTitle>
                <CardDescription>{t.trendBody}</CardDescription>
              </CardHeader>
              <CardContent>
                <TrendChart weeks={weeks} />
              </CardContent>
            </Card>
          </>
        )}

        <Card className="gap-0 py-0">
          <CardHeader className="pt-6">
            <CardTitle>{t.compareTitle}</CardTitle>
            <CardDescription>{t.compareBody}</CardDescription>
          </CardHeader>
          <div className="mt-4 overflow-x-auto pb-2">
            <table className="w-full min-w-[40rem] border-separate border-spacing-1 text-sm">
              <thead>
                <tr>
                  <th className="pl-3 text-left text-xs font-normal text-muted-foreground">{t.site}</th>
                  {PROCESSES.map((p) => (
                    <th key={p} className="text-center text-xs font-normal text-muted-foreground">
                      {dict.processes[p].label}
                    </th>
                  ))}
                  <th className="pr-3 text-center text-xs font-medium text-muted-foreground">{t.overall}</th>
                </tr>
              </thead>
              <tbody>
                {data.comparison.map(({ site, summary: s }) => (
                  <tr key={site.id}>
                    <th
                      scope="row"
                      className={cn(
                        "rounded-md pl-3 text-left font-normal",
                        site.id === data.site.id && "font-semibold",
                      )}
                    >
                      {site.name}
                      <span className="block text-xs font-normal text-muted-foreground">{industry(site.industry)}</span>
                    </th>
                    {[...s.processes.map((p) => p.index), s.overallIndex].map((v, i) => (
                      <td
                        key={i}
                        className={cn("h-12 rounded-md text-center tabular-nums", i === PROCESSES.length && "font-semibold")}
                        style={s.totalHours > 0 ? divergingStyle(v) : undefined}
                        title={s.totalHours > 0 ? fill(t.cellTitle, { status: t.status[statusOf(v)] }) : dict.common.noData}
                      >
                        {s.totalHours > 0 ? (
                          <>
                            {idx(v)}
                            <span className="ml-0.5 text-xs text-muted-foreground">
                              {statusOf(v) === "above" ? "▲" : statusOf(v) === "below" ? "▼" : ""}
                            </span>
                          </>
                        ) : (
                          "–"
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </ProductivityShell>
  );
}

function Stat({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <Card className="gap-2">
      <CardHeader>
        <CardDescription>{label}</CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-3xl font-semibold tracking-tight">{value}</p>
        <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
      </CardContent>
    </Card>
  );
}
