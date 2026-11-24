import { ArrowUpRight, Boxes } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import { PageHeader } from "@/components/app/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { listLayouts } from "@/lib/data/layouts";
import { localePath } from "@/i18n/config";
import { fill } from "@/i18n/fill";
import { getDictionary, getLocale } from "@/i18n/server";
import { formatFor } from "@/lib/format";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getDictionary()).studio.title };
}

export default async function StudioIndexPage() {
  const t = (await getDictionary()).studio;
  return (
    <>
      <PageHeader
        title={t.title}
        description={t.description}
      />
      <div className="p-6">
        <Suspense
          fallback={
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {Array.from({ length: 3 }, (_, i) => (
                <Skeleton key={i} className="h-40" />
              ))}
            </div>
          }
        >
          <LayoutCards />
        </Suspense>
      </div>
    </>
  );
}


async function LayoutCards() {
  const layouts = await listLayouts();
  const locale = await getLocale();
  const dict = await getDictionary(locale);
  const t = dict.studio;
  const f = formatFor(locale);
  if (layouts.length === 0) {
    return <p className="text-sm text-muted-foreground">{t.empty}</p>;
  }
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {layouts.map((l) => (
        <Link key={l.id} href={localePath(locale, `/studio/${l.id}`)} className="group">
          <Card className="h-full transition-colors group-hover:border-primary/40">
            <CardHeader>
              <CardTitle className="flex items-start justify-between gap-2">
                <span className="flex items-center gap-2">
                  <Boxes className="size-4 text-muted-foreground" />
                  {l.name}
                </span>
                <ArrowUpRight className="size-4 text-muted-foreground transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
              </CardTitle>
              <CardDescription>
                {l.projectName} · {l.city}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <dl className="grid grid-cols-3 gap-2 text-sm">
                <div>
                  <dt className="text-xs text-muted-foreground">{t.floor}</dt>
                  <dd className="tabular-nums">
                    {l.floorWidth}×{l.floorDepth} m
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">{t.rows}</dt>
                  <dd className="tabular-nums">{f.number(l.rowCount)}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">{t.positions}</dt>
                  <dd className="font-medium tabular-nums">{f.number(l.positions)}</dd>
                </div>
              </dl>
              <p className="mt-4 text-xs text-muted-foreground">{fill(dict.common.updated, { date: f.dateTime(l.updatedAt) })}</p>
            </CardContent>
          </Card>
        </Link>
      ))}
    </div>
  );
}
