import { ArrowLeft, Boxes, ChartColumnBig, DoorOpen, MoveVertical, Ruler } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";

import { PageHeader } from "@/components/app/page-header";
import { ProjectStatusBadge } from "@/components/app/project-status";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { layoutIdsBySite } from "@/lib/data/layouts";
import { getProject } from "@/lib/data/projects";
import { localePath } from "@/i18n/config";
import { fill } from "@/i18n/fill";
import { getDictionary, getLocale } from "@/i18n/server";
import { formatFor } from "@/lib/format";

export default function ProjectPage({ params }: PageProps<"/[lang]/projects/[projectId]">) {
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

async function ProjectDetail({ params }: Pick<PageProps<"/[lang]/projects/[projectId]">, "params">) {
  const { projectId } = await params;
  const p = await getProject(projectId);
  const layoutBySite = await layoutIdsBySite(p.sites.map((s) => s.id));
  const locale = await getLocale();
  const dict = await getDictionary(locale);
  const t = dict.projects;
  const f = formatFor(locale);

  return (
    <>
      <PageHeader
        title={p.name}
        description={
          <span className="flex flex-wrap items-center gap-2">
            <span className="font-mono">{p.code}</span>·<span>{p.client}</span>·<span>{dict.industries[p.industry as keyof typeof dict.industries] ?? p.industry}</span>·
            <span>{fill(dict.common.sinceLower, { date: f.date(p.startedOn) })}</span>
            <ProjectStatusBadge status={p.status} />
          </span>
        }
        actions={
          <Button variant="ghost" size="sm" asChild>
            <Link href={localePath(locale, "/projects")}>
              <ArrowLeft /> {dict.common.allProjects}
            </Link>
          </Button>
        }
      />
      <div className="space-y-6 p-6">
        {p.summary && <p className="max-w-3xl text-muted-foreground">{p.summary}</p>}

        <section className="space-y-3">
          <h2 className="text-sm font-medium uppercase tracking-wide text-muted-foreground">{t.sitesHeading}</h2>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {p.sites.map((site) => (
              <Card key={site.id}>
                <CardHeader>
                  <CardTitle>{site.name}</CardTitle>
                  <CardDescription>{site.city}</CardDescription>
                </CardHeader>
                <CardContent>
                  <dl className="grid grid-cols-2 gap-3 text-sm">
                    <Spec icon={Ruler} label={t.floorArea} value={`${f.number(site.floorArea)} m²`} />
                    <Spec icon={MoveVertical} label={t.clearHeight} value={`${site.clearHeight} m`} />
                    <Spec icon={DoorOpen} label={t.dockDoors} value={f.number(site.dockDoors)} />
                    <Spec label={t.skus} value={f.number(site.skuCount)} />
                  </dl>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <Button variant="outline" size="sm" asChild>
                      <Link href={localePath(locale, `/analysis?site=${site.id}`)}>
                        <ChartColumnBig /> {t.analyse}
                      </Link>
                    </Button>
                    {layoutBySite.has(site.id) && (
                      <Button variant="outline" size="sm" asChild>
                        <Link href={localePath(locale, `/studio/${layoutBySite.get(site.id)}`)}>
                          <Boxes /> {t.openLayout}
                        </Link>
                      </Button>
                    )}
                  </div>
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
