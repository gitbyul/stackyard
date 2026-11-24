import type { Metadata } from "next";
import { Suspense } from "react";

import { PageHeader } from "@/components/app/page-header";
import { DataToolbar } from "@/components/data/data-toolbar";
import { DatasetCard } from "@/components/data/dataset-card";
import { DeleteSite } from "@/components/data/delete-site";
import { Skeleton } from "@/components/ui/skeleton";
import { fill } from "@/i18n/fill";
import { getDictionary } from "@/i18n/server";
import { getDatasetSummary, getDataWorkspace } from "@/lib/data/datasets";
import { DATASETS } from "@/lib/import/datasets";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getDictionary()).data.title };
}

export default async function DataPage({ searchParams }: PageProps<"/[lang]/data">) {
  const t = (await getDictionary()).data;
  return (
    <>
      <PageHeader title={t.title} description={t.description} />
      <Suspense
        fallback={
          <div className="space-y-6 p-6">
            <Skeleton className="h-9 w-full max-w-md" />
            <div className="grid gap-4 lg:grid-cols-3">
              <Skeleton className="h-72" />
              <Skeleton className="h-72" />
              <Skeleton className="h-72" />
            </div>
          </div>
        }
      >
        <DataManager searchParams={searchParams} />
      </Suspense>
    </>
  );
}

async function DataManager({ searchParams }: Pick<PageProps<"/[lang]/data">, "searchParams">) {
  const sp = await searchParams;
  const wanted = Array.isArray(sp.site) ? sp.site[0] : sp.site;
  const [{ projects, sites }, t] = await Promise.all([getDataWorkspace(), getDictionary().then((d) => d.data)]);
  const current = sites.find((s) => s.id === wanted) ?? sites[0];
  const summary = current ? await getDatasetSummary(current.id) : null;

  return (
    <>
      <DataToolbar
        sites={sites.map((s) => ({ id: s.id, name: s.name, projectName: s.projectName }))}
        projects={projects.map((p) => ({ id: p.id, name: p.name }))}
        siteId={current?.id ?? null}
      />
      <div className="space-y-6 p-6">
        {!current || !summary ? (
          <p className="text-sm text-muted-foreground">{t.noSites}</p>
        ) : (
          <>
            <p className="text-xs text-muted-foreground">
              {fill(t.siteMeta, { project: current.projectName, city: current.city })} · {t.demoNote}
            </p>
            <div className="grid gap-4 lg:grid-cols-3">
              {DATASETS.map((kind) => (
                <DatasetCard key={kind} siteId={current.id} siteName={current.name} kind={kind} stats={summary[kind]} />
              ))}
            </div>
            <DeleteSite siteId={current.id} siteName={current.name} />
          </>
        )}
      </div>
    </>
  );
}
