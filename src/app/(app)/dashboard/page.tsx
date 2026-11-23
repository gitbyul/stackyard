import { ArrowUpRight, Boxes, Building2, FolderKanban, PackageCheck } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import { PageHeader } from "@/components/app/page-header";
import { ProjectStatusBadge } from "@/components/app/project-status";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { getWorkspaceTotals, listProjects } from "@/lib/data/projects";
import { formatCompact, formatDate, formatNumber } from "@/lib/format";

export const metadata: Metadata = { title: "Overview" };

export default function DashboardPage() {
  return (
    <>
      <PageHeader title="Overview" description="Everything in your workspace at a glance." />
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
  const t = await getWorkspaceTotals();
  const items = [
    { label: "Projects", value: formatNumber(t.projects), icon: FolderKanban },
    { label: "Sites", value: formatNumber(t.sites), icon: Building2 },
    { label: "SKUs tracked", value: formatNumber(t.skus), icon: Boxes },
    {
      label: "Units shipped",
      value: formatCompact(t.unitsShipped),
      hint: `${formatNumber(t.orderLines)} order lines`,
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
  return (
    <Card>
      <CardHeader>
        <CardTitle>Projects</CardTitle>
        <CardDescription>Client engagements in progress.</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-3 md:grid-cols-3">
        {projects.map((p) => (
          <Link
            key={p.id}
            href={`/projects/${p.id}`}
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
              <span>Since {formatDate(p.startedOn)}</span>
            </div>
          </Link>
        ))}
      </CardContent>
    </Card>
  );
}
