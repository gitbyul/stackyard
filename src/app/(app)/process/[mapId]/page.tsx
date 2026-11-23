import Link from "next/link";
import { Suspense } from "react";

import { MapEditor } from "@/components/process/map-editor";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Skeleton } from "@/components/ui/skeleton";
import { getProcessMap } from "@/lib/data/process-maps";

export default function ProcessMapPage({ params }: PageProps<"/process/[mapId]">) {
  return (
    <div className="flex h-svh min-w-0 flex-col">
      <Suspense
        fallback={
          <>
            <header className="flex h-12 items-center gap-2 border-b px-4">
              <Skeleton className="h-4 w-64" />
            </header>
            <Skeleton className="m-4 flex-1" />
          </>
        }
      >
        <ProcessMap params={params} />
      </Suspense>
    </div>
  );
}

async function ProcessMap({ params }: Pick<PageProps<"/process/[mapId]">, "params">) {
  const { mapId } = await params;
  const map = await getProcessMap(mapId);
  return (
    <>
      <header className="flex h-12 shrink-0 items-center gap-2 border-b px-4 text-sm">
        <SidebarTrigger className="-ml-1" />
        <Separator orientation="vertical" className="mr-1 data-[orientation=vertical]:h-4" />
        <nav aria-label="Breadcrumb" className="flex min-w-0 items-center gap-1.5 text-muted-foreground">
          <Link href="/process" className="hover:text-foreground">
            Process maps
          </Link>
          <span>/</span>
          <Link href={`/projects/${map.projectId}`} className="truncate hover:text-foreground">
            {map.projectName}
          </Link>
          <span>/</span>
          <span className="truncate font-medium text-foreground">{map.name}</span>
        </nav>
      </header>
      <MapEditor
        key={map.id}
        mapId={map.id}
        versions={map.versions.map((v) => ({ ...v, createdAt: v.createdAt.toISOString() }))}
      />
    </>
  );
}
