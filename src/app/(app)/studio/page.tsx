import { ArrowUpRight, Boxes } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import { PageHeader } from "@/components/app/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { listLayouts } from "@/lib/data/layouts";
import { formatNumber } from "@/lib/format";

export const metadata: Metadata = { title: "Layout studio" };

export default function StudioIndexPage() {
  return (
    <>
      <PageHeader
        title="Layout studio"
        description="Plan rack layouts in 3D. Each site starts from a generated base plan."
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

const updated = new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short" });

async function LayoutCards() {
  const layouts = await listLayouts();
  if (layouts.length === 0) {
    return <p className="text-sm text-muted-foreground">No layouts yet. Run the seed to create base plans.</p>;
  }
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {layouts.map((l) => (
        <Link key={l.id} href={`/studio/${l.id}`} className="group">
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
                  <dt className="text-xs text-muted-foreground">Floor</dt>
                  <dd className="tabular-nums">
                    {l.floorWidth}×{l.floorDepth} m
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">Rows</dt>
                  <dd className="tabular-nums">{formatNumber(l.rowCount)}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">Positions</dt>
                  <dd className="font-medium tabular-nums">{formatNumber(l.positions)}</dd>
                </div>
              </dl>
              <p className="mt-4 text-xs text-muted-foreground">Updated {updated.format(l.updatedAt)}</p>
            </CardContent>
          </Card>
        </Link>
      ))}
    </div>
  );
}
