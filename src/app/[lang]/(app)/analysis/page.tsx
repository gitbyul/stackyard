import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import { AnalysisShell } from "@/components/analysis/analysis-filters";
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
import { localePath } from "@/i18n/config";
import { fill } from "@/i18n/fill";
import { getDictionary, getLocale } from "@/i18n/server";
import { formatFor } from "@/lib/format";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getDictionary()).analysis.title };
}

export default async function AnalysisPage({ searchParams }: PageProps<"/[lang]/analysis">) {
  const t = (await getDictionary()).analysis;
  return (
    <>
      <PageHeader title={t.title} description={t.description} />
      <Suspense fallback={<AnalysisSkeleton />}>
        <Analysis searchParams={searchParams} />
      </Suspense>
    </>
  );
}

const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

async function Analysis({ searchParams }: Pick<PageProps<"/[lang]/analysis">, "searchParams">) {
  const sp = await searchParams;
  const sites = await listAnalysableSites();
  const locale = await getLocale();
  const dict = await getDictionary(locale);
  const t = dict.analysis;
  const f = formatFor(locale);
  if (sites.length === 0) {
    return (
      <div className="p-6">
        <Card>
          <CardHeader>
            <CardTitle>{t.noSites}</CardTitle>
            <CardDescription>{t.noSitesBody}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant="outline">
              <Link href={localePath(locale, "/projects")}>{t.goToProjects}</Link>
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
  const metricLabel = t.metric[metric];
  const metricLower = t.metricLower[metric];

  return (
    <AnalysisShell sites={sites} values={{ site: siteId, period: String(period), metric, cut }}>
      <div className="space-y-6 p-6">
        {data?.to ? (
          <p className="text-xs text-muted-foreground">
            {fill(t.range, {
              project: data.site.projectName,
              site: data.site.name,
              from: f.date(data.from!),
              to: f.date(data.to),
              n: period,
            })}
          </p>
        ) : (
          <p className="text-sm text-muted-foreground">{t.noShipments}</p>
        )}

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Card className="gap-2 sm:col-span-2">
            <CardHeader>
              <CardDescription>{t.concentration}</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-5xl font-semibold tracking-tight">
                {Math.round(a.skuShare * 100)}% → {Math.round(a.valueShare * 100)}%
              </p>
              <p className="mt-2 text-sm text-muted-foreground">
                {fill(t.concentrationBody, {
                  a: f.number(a.skuCount),
                  total: f.number(result.items.length),
                  share: Math.round(a.valueShare * 100),
                  metric: metricLower,
                })}
              </p>
            </CardContent>
          </Card>
          <Stat
            label={metricLabel}
            value={f.compact(result.total)}
            hint={fill(t.orders, { n: f.number(data?.orders ?? 0) })}
          />
          <Stat
            label={t.idle}
            value={f.number(result.idleCount)}
            hint={result.idleCount > 0 ? t.idleSome : t.idleNone}
          />
        </div>

        <div className="grid gap-6 xl:grid-cols-5">
          <Card className="xl:col-span-3">
            <CardHeader>
              <CardTitle>{t.curveTitle}</CardTitle>
              <CardDescription>{fill(t.curveBody, { metric: metricLower, a: aPct, b: bPct })}</CardDescription>
            </CardHeader>
            <CardContent>
              {result.total > 0 ? (
                <ParetoChart items={result.items} metric={metric} thresholds={thresholds} />
              ) : (
                <p className="py-16 text-center text-sm text-muted-foreground">{t.noMovement}</p>
              )}
            </CardContent>
          </Card>
          <Card className="xl:col-span-2">
            <CardHeader>
              <CardTitle>{t.sharesTitle}</CardTitle>
              <CardDescription>{t.sharesBody}</CardDescription>
            </CardHeader>
            <CardContent>
              <ClassShareBars summary={result.summary} metricLabel={metricLower} />
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>{t.matrixTitle}</CardTitle>
            <CardDescription>{t.matrixBody}</CardDescription>
          </CardHeader>
          <CardContent>
            <CrossMatrix matrix={matrix} total={result.items.length} />
          </CardContent>
        </Card>

        <Card className="gap-0 py-0">
          <CardHeader className="pt-6">
            <CardTitle>{t.rankingTitle}</CardTitle>
            <CardDescription>{fill(t.rankingBody, { metric: metricLower })}</CardDescription>
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
