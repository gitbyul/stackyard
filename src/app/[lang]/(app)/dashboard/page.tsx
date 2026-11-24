import { ArrowUpRight, Boxes, Building2, FolderKanban, PackageCheck } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import { PageHeader } from "@/components/app/page-header";
import { ProjectStatusBadge } from "@/components/app/project-status";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { getWorkspaceTotals, listProjects } from "@/lib/data/projects";
import { localePath } from "@/i18n/config";
import { fill } from "@/i18n/fill";
import { getDictionary, getLocale } from "@/i18n/server";
import { formatFor } from "@/lib/format";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getDictionary()).dashboard.title };
}

export default async function DashboardPage() {
  const t = (await getDictionary()).dashboard;
  return (
    <>
      <PageHeader title={t.title} description={t.description} />
      <div className="space-y-6 p-6">
        <Suspense fallback={<StatsSkeleton />}>
          <Stats />
        </Suspense>
        <Suspense fallback={<Skeleton className="h-64 w-full" />}>
          <RecentProjects />
        </Suspense>
      </div>
    </>
  );
}

async function Stats() {
  const totals = await getWorkspaceTotals();
  const locale = await getLocale();
  const t = (await getDictionary(locale)).dashboard;
  const f = formatFor(locale);
  const items = [
    { label: t.projects, value: f.number(totals.projects), icon: FolderKanban },
    { label: t.sites, value: f.number(totals.sites), icon: Building2 },
    { label: t.skus, value: f.number(totals.skus), icon: Boxes },
    {
      label: t.units,
      value: f.compact(totals.unitsShipped),
      hint: fill(t.orderLines, { n: f.number(totals.orderLines) }),
      icon: PackageCheck,
    },
  ];
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {items.map((item) => (
        <Card key={item.label} className="gap-2">
          <CardHeader>
            <CardDescription>{item.label}</CardDescription>
            <CardAction>
              <item.icon className="size-4 text-muted-foreground" />
            </CardAction>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold tabular-nums tracking-tight">{item.value}</p>
            {item.hint && <p className="mt-1 text-xs text-muted-foreground">{item.hint}</p>}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function StatsSkeleton() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {Array.from({ length: 4 }, (_, i) => (
        <Skeleton key={i} className="h-28" />
      ))}
    </div>
  );
}

async function RecentProjects() {
  const projects = await listProjects();
  const locale = await getLocale();
  const dict = await getDictionary(locale);
  const t = dict.dashboard;
  const f = formatFor(locale);
  return (
    <Card>
      <CardHeader>
        <CardTitle>{t.projectsTitle}</CardTitle>
        <CardDescription>{t.projectsDescription}</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-3 md:grid-cols-3">
        {projects.map((p) => (
          <Link
            key={p.id}
            href={localePath(locale, `/projects/${p.id}`)}
            className="group rounded-lg border p-4 transition-colors hover:border-primary/40 hover:bg-accent/50"
          >
            <div className="flex items-start justify-between gap-2">
              <span className="font-mono text-xs text-muted-foreground">{p.code}</span>
              <ArrowUpRight className="size-4 text-muted-foreground transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
            </div>
            <p className="mt-2 font-medium leading-snug">{p.name}</p>
            <p className="text-sm text-muted-foreground">{p.client}</p>
            <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground">
              <ProjectStatusBadge status={p.status} />
              <span>{fill(dict.common.since, { date: f.date(p.startedOn) })}</span>
            </div>
          </Link>
        ))}
      </CardContent>
    </Card>
  );
}
