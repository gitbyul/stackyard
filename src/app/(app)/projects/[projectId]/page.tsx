import { ArrowLeft, ChartColumnBig, DoorOpen, MoveVertical, Ruler } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";

import { PageHeader } from "@/components/app/page-header";
import { ProjectStatusBadge } from "@/components/app/project-status";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { getProject } from "@/lib/data/projects";
import { formatDate, formatNumber } from "@/lib/format";

export default function ProjectPage({ params }: PageProps<"/projects/[projectId]">) {
  return (
    <Suspense
      fallback={
        <>
          <PageHeader title={<Skeleton className="h-8 w-72" />} />
          <div className="p-6">
            <Skeleton className="h-48 w-full" />
          </div>
        </>
      }
    >
      <ProjectDetail params={params} />
    </Suspense>
  );
}

async function ProjectDetail({ params }: Pick<PageProps<"/projects/[projectId]">, "params">) {
  const { projectId } = await params;
  const p = await getProject(projectId);

  return (
    <>
      <PageHeader
        title={p.name}
        description={
          <span className="flex flex-wrap items-center gap-2">
            <span className="font-mono">{p.code}</span>·<span>{p.client}</span>·<span>{p.industry}</span>·
            <span>since {formatDate(p.startedOn)}</span>
            <ProjectStatusBadge status={p.status} />
          </span>
        }
        actions={
          <Button variant="ghost" size="sm" asChild>
            <Link href="/projects">
              <ArrowLeft /> All projects
            </Link>
          </Button>
        }
      />
      <div className="space-y-6 p-6">
        {p.summary && <p className="max-w-3xl text-muted-foreground">{p.summary}</p>}

        <section className="space-y-3">
          <h2 className="text-sm font-medium uppercase tracking-wide text-muted-foreground">Sites</h2>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {p.sites.map((site) => (
              <Card key={site.id}>
                <CardHeader>
                  <CardTitle>{site.name}</CardTitle>
                  <CardDescription>{site.city}</CardDescription>
                </CardHeader>
                <CardContent>
                  <dl className="grid grid-cols-2 gap-3 text-sm">
                    <Spec icon={Ruler} label="Floor area" value={`${formatNumber(site.floorArea)} m²`} />
                    <Spec icon={MoveVertical} label="Clear height" value={`${site.clearHeight} m`} />
                    <Spec icon={DoorOpen} label="Dock doors" value={formatNumber(site.dockDoors)} />
                    <Spec label="SKUs" value={formatNumber(site.skuCount)} />
                  </dl>
                  <Button variant="outline" size="sm" className="mt-4" asChild>
                    <Link href={`/analysis?site=${site.id}`}>
                      <ChartColumnBig /> Analyse movement
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      </div>
    </>
  );
}

function Spec({
  icon: Icon,
  label,
  value,
}: {
  icon?: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
}) {
  return (
    <div>
      <dt className="flex items-center gap-1 text-xs text-muted-foreground">
        {Icon && <Icon className="size-3.5" />}
        {label}
      </dt>
      <dd className="font-medium tabular-nums">{value}</dd>
    </div>
  );
}
