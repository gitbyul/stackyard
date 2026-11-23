import { ArrowUpRight, Workflow } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import { PageHeader } from "@/components/app/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { listProcessMaps } from "@/lib/data/process-maps";

export const metadata: Metadata = { title: "Process maps" };

const when = new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short" });
const fmtMin = (m: number) => (m >= 60 ? `${Math.floor(m / 60)} h ${Math.round(m % 60)} min` : `${Math.round(m)} min`);

export default function ProcessMapsPage() {
  return (
    <>
      <PageHeader
        title="Process maps"
        description="Flow-process charts from dock to dock. Every save is kept as a version."
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
  if (maps.length === 0) return <p className="text-sm text-muted-foreground">No process maps yet.</p>;
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {maps.map((m) => (
        <Link key={m.id} href={`/process/${m.id}`} className="group">
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
                  <dt className="text-xs text-muted-foreground">Steps</dt>
                  <dd className="tabular-nums">{m.steps}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">Value-added</dt>
                  <dd className="font-medium tabular-nums">{Math.round(m.valueAddedRatio * 100)}%</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">Critical path</dt>
                  <dd className="tabular-nums">{fmtMin(m.criticalMinutes)}</dd>
                </div>
              </dl>
              <p className="mt-4 text-xs text-muted-foreground">
                Version {m.version}
                {m.updatedAt && ` · ${when.format(m.updatedAt)}`}
              </p>
            </CardContent>
          </Card>
        </Link>
      ))}
    </div>
  );
}
