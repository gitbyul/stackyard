import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import { AnalysisShell } from "@/components/analysis/analysis-filters";
import { METRIC_LABEL } from "@/components/analysis/abc-colors";
import { ClassShareBars } from "@/components/analysis/class-share-bars";
import { CrossMatrix } from "@/components/analysis/cross-matrix";
import { ParetoChart } from "@/components/analysis/pareto-chart";
import { SkuTable } from "@/components/analysis/sku-table";
import { PageHeader } from "@/components/app/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { classifyAbc, crossClassify, type AbcMetric } from "@/lib/analysis/abc";
import { CUT_PRESETS, DEFAULT_CUT } from "@/lib/analysis/presets";
import { getSkuMovement, listAnalysableSites, PERIODS, type PeriodDays } from "@/lib/data/analysis";
import { formatCompact, formatDate, formatNumber } from "@/lib/format";

export const metadata: Metadata = { title: "Movement analysis" };

export default function AnalysisPage({ searchParams }: PageProps<"/analysis">) {
  return (
    <>
      <PageHeader
        title="Movement analysis"
        description="ABC classification of SKUs by outbound units or order lines."
      />
      <Suspense fallback={<AnalysisSkeleton />}>
        <Analysis searchParams={searchParams} />
      </Suspense>
    </>
  );
}

const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

async function Analysis({ searchParams }: Pick<PageProps<"/analysis">, "searchParams">) {
  const sp = await searchParams;
  const sites = await listAnalysableSites();
  if (sites.length === 0) {
    return (
      <div className="p-6">
        <Card>
          <CardHeader>
            <CardTitle>No sites yet</CardTitle>
            <CardDescription>Add a site with order data to a project to analyse it.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant="outline">
              <Link href="/projects">Go to projects</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Unknown or missing params fall back to defaults instead of erroring.
  const siteId = sites.some((s) => s.id === one(sp.site)) ? one(sp.site)! : sites[0].id;
  const periodParam = Number(one(sp.period));
  const period: PeriodDays = (PERIODS as readonly number[]).includes(periodParam)
    ? (periodParam as PeriodDays)
    : 90;
  const metric: AbcMetric = one(sp.metric) === "lines" ? "lines" : "units";
  const cut = CUT_PRESETS.some((p) => p.value === one(sp.cut)) ? one(sp.cut)! : DEFAULT_CUT;
  const [aPct, bPct] = cut.split("-").map(Number);
  const thresholds = { a: aPct / 100, b: bPct / 100 };

  const data = await getSkuMovement(siteId, period);
  const units = classifyAbc(data?.rows ?? [], "units", thresholds);
  const lines = classifyAbc(data?.rows ?? [], "lines", thresholds);
  const result = metric === "units" ? units : lines;
  const matrix = crossClassify(units, lines);
  const a = result.summary[0];
  const metricLabel = METRIC_LABEL[metric];

  return (
    <AnalysisShell sites={sites} values={{ site: siteId, period: String(period), metric, cut }}>
      <div className="space-y-6 p-6">
        {data?.to ? (
          <p className="text-xs text-muted-foreground">
            {data.site.projectName} · {data.site.name} · {formatDate(data.from!)} – {formatDate(data.to)} (last{" "}
            {period} days of data)
          </p>
        ) : (
          <p className="text-sm text-muted-foreground">This site has no shipments yet.</p>
        )}

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Card className="gap-2 sm:col-span-2">
            <CardHeader>
              <CardDescription>Class A concentration</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-5xl font-semibold tracking-tight">
                {Math.round(a.skuShare * 100)}% → {Math.round(a.valueShare * 100)}%
              </p>
              <p className="mt-2 text-sm text-muted-foreground">
                {formatNumber(a.skuCount)} of {formatNumber(result.items.length)} SKUs make up{" "}
                {Math.round(a.valueShare * 100)}% of {metricLabel.toLowerCase()}.
              </p>
            </CardContent>
          </Card>
          <Stat label={metricLabel} value={formatCompact(result.total)} hint={`${formatNumber(data?.orders ?? 0)} orders`} />
          <Stat
            label="Idle SKUs"
            value={formatNumber(result.idleCount)}
            hint={result.idleCount > 0 ? "No movement in period; candidates to delist" : "Every SKU moved"}
          />
        </div>

        <div className="grid gap-6 xl:grid-cols-5">
          <Card className="xl:col-span-3">
            <CardHeader>
              <CardTitle>Cumulative movement curve</CardTitle>
              <CardDescription>
                SKUs ranked by {metricLabel.toLowerCase()}, highest first. Cut-offs at {aPct}% and {bPct}%.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {result.total > 0 ? (
                <ParetoChart items={result.items} metric={metric} thresholds={thresholds} />
              ) : (
                <p className="py-16 text-center text-sm text-muted-foreground">No movement in this period.</p>
              )}
            </CardContent>
          </Card>
          <Card className="xl:col-span-2">
            <CardHeader>
              <CardTitle>Class shares</CardTitle>
              <CardDescription>How SKU count compares with the movement it carries.</CardDescription>
            </CardHeader>
            <CardContent>
              <ClassShareBars summary={result.summary} metricLabel={metricLabel} />
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Units × order lines</CardTitle>
            <CardDescription>
              SKUs by units class and order-lines class. Mismatches point to different storage types.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <CrossMatrix matrix={matrix} total={result.items.length} />
          </CardContent>
        </Card>

        <Card className="gap-0 py-0">
          <CardHeader className="pt-6">
            <CardTitle>SKU ranking</CardTitle>
            <CardDescription>Ranked by {metricLabel.toLowerCase()}. Export includes every SKU.</CardDescription>
          </CardHeader>
          <SkuTable
            items={result.items}
            metric={metric}
            fileName={`abc-${data?.site.name.toLowerCase().replaceAll(/\s+/g, "-") ?? "site"}-${metric}-${period}d.csv`}
          />
        </Card>
      </div>
    </AnalysisShell>
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

function AnalysisSkeleton() {
  return (
    <div className="space-y-6 p-6">
      <Skeleton className="h-9 w-full max-w-3xl" />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Skeleton className="h-36 sm:col-span-2" />
        <Skeleton className="h-36" />
        <Skeleton className="h-36" />
      </div>
      <Skeleton className="h-96 w-full" />
    </div>
  );
}
