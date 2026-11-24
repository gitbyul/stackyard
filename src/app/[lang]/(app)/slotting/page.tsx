import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import { PageHeader } from "@/components/app/page-header";
import { SlottingView } from "@/components/slotting/slotting-view";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { classifyAbc } from "@/lib/analysis/abc";
import { getSkuMovement, PERIODS, type PeriodDays } from "@/lib/data/analysis";
import { getLayout, listLayouts } from "@/lib/data/layouts";
import { localePath } from "@/i18n/config";
import { fill } from "@/i18n/fill";
import { getDictionary, getLocale } from "@/i18n/server";
import { formatFor } from "@/lib/format";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getDictionary()).slotting.title };
}

export default async function SlottingPage({ searchParams }: PageProps<"/[lang]/slotting">) {
  const t = (await getDictionary()).slotting;
  return (
    <>
      <PageHeader
        title={t.title}
        description={t.description}
      />
      <Suspense
        fallback={
          <div className="space-y-6 p-6">
            <Skeleton className="h-9 w-full max-w-4xl" />
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-96 w-full" />
          </div>
        }
      >
        <Slotting searchParams={searchParams} />
      </Suspense>
    </>
  );
}

const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

async function Slotting({ searchParams }: Pick<PageProps<"/[lang]/slotting">, "searchParams">) {
  const sp = await searchParams;
  const layouts = await listLayouts();
  const locale = await getLocale();
  const t = (await getDictionary(locale)).slotting;
  const f = formatFor(locale);
  if (layouts.length === 0) {
    return (
      <div className="space-y-3 p-6 text-sm text-muted-foreground">
        <p>{t.needsLayout}</p>
        <Button asChild variant="outline" size="sm">
          <Link href={localePath(locale, "/studio")}>{t.openStudio}</Link>
        </Button>
      </div>
    );
  }

  const layoutId = layouts.some((l) => l.id === one(sp.layout)) ? one(sp.layout)! : layouts[0].id;
  const periodParam = Number(one(sp.period));
  const period: PeriodDays = (PERIODS as readonly number[]).includes(periodParam)
    ? (periodParam as PeriodDays)
    : 90;

  const layout = await getLayout(layoutId);
  const movement = await getSkuMovement(layout.siteId, period);
  const rows = movement?.rows ?? [];
  // Class by order lines: pick visits are what drive travel.
  const abc = classifyAbc(rows, "lines");
  const clsById = new Map(abc.items.map((i) => [i.skuId, i.cls]));

  return (
    <SlottingView
      key={`${layoutId}-${period}`}
      layouts={layouts.map((l) => ({ id: l.id, name: l.name, projectName: l.projectName }))}
      layoutId={layoutId}
      period={period}
      rangeLabel={
        movement?.to
          ? fill(t.range, { project: layout.projectName, from: f.date(movement.from!), to: f.date(movement.to) })
          : fill(t.noShipments, { project: layout.projectName })
      }
      rows={layout.doc.rows}
      floor={{ width: layout.floorWidth, depth: layout.floorDepth }}
      dockDoors={layout.dockDoors}
      skus={rows.map((r) => ({
        skuId: r.skuId,
        code: r.code,
        name: r.name,
        cls: clsById.get(r.skuId) ?? "C",
        units: r.units,
        lines: r.lines,
        lengthMm: r.lengthMm,
        widthMm: r.widthMm,
        heightMm: r.heightMm,
        unitsPerCase: r.unitsPerCase,
      }))}
    />
  );
}
