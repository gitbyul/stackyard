import { ArrowUpRight, Workflow } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import { PageHeader } from "@/components/app/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { localePath } from "@/i18n/config";
import { fill } from "@/i18n/fill";
import { getDictionary, getLocale } from "@/i18n/server";
import { listProcessMaps } from "@/lib/data/process-maps";
import { formatFor } from "@/lib/format";
import { formatMinutes } from "@/lib/process-map/format";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getDictionary()).process.title };
}


export default async function ProcessMapsPage() {
  const t = (await getDictionary()).process;
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
          <MapCards />
        </Suspense>
      </div>
    </>
  );
}

async function MapCards() {
  const maps = await listProcessMaps();
  const locale = await getLocale();
  const dict = await getDictionary(locale);
  const t = dict.process;
  const f = formatFor(locale);
  if (maps.length === 0) return <p className="text-sm text-muted-foreground">{t.empty}</p>;
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {maps.map((m) => (
        <Link key={m.id} href={localePath(locale, `/process/${m.id}`)} className="group">
          <Card className="h-full transition-colors group-hover:border-primary/40">
            <CardHeader>
              <CardTitle className="flex items-start justify-between gap-2">
                <span className="flex items-center gap-2">
                  <Workflow className="size-4 text-muted-foreground" />
                  {m.name}
                </span>
                <ArrowUpRight className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
              </CardTitle>
              <CardDescription>{m.projectName}</CardDescription>
            </CardHeader>
            <CardContent>
              <dl className="grid grid-cols-3 gap-2 text-sm">
                <div>
                  <dt className="text-xs text-muted-foreground">{t.steps}</dt>
                  <dd className="tabular-nums">{m.steps}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">{t.valueAdded}</dt>
                  <dd className="font-medium tabular-nums">{Math.round(m.valueAddedRatio * 100)}%</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">{t.criticalPath}</dt>
                  <dd className="tabular-nums">{formatMinutes(t, m.criticalMinutes)}</dd>
                </div>
              </dl>
              <p className="mt-4 text-xs text-muted-foreground">
                {fill(dict.common.version, { n: m.version })}
                {m.updatedAt && ` · ${f.dateTime(m.updatedAt)}`}
              </p>
            </CardContent>
          </Card>
        </Link>
      ))}
    </div>
  );
}
