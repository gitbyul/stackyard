import Link from "next/link";
import { Suspense } from "react";

import { StudioEditor } from "@/components/studio/editor";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Skeleton } from "@/components/ui/skeleton";
import { getLayout } from "@/lib/data/layouts";

export default function StudioLayoutPage({ params }: PageProps<"/studio/[layoutId]">) {
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
        <Studio params={params} />
      </Suspense>
    </div>
  );
}

async function Studio({ params }: Pick<PageProps<"/studio/[layoutId]">, "params">) {
  const { layoutId } = await params;
  const l = await getLayout(layoutId);

  return (
    <>
      <header className="flex h-12 shrink-0 items-center gap-2 border-b px-4 text-sm">
        <SidebarTrigger className="-ml-1" />
        <Separator orientation="vertical" className="mr-1 data-[orientation=vertical]:h-4" />
        <nav aria-label="Breadcrumb" className="flex min-w-0 items-center gap-1.5 text-muted-foreground">
          <Link href="/studio" className="hover:text-foreground">
            Studio
          </Link>
          <span>/</span>
          <Link href={`/projects/${l.projectId}`} className="truncate hover:text-foreground">
            {l.projectName}
          </Link>
          <span>/</span>
          <span className="truncate font-medium text-foreground">{l.name}</span>
        </nav>
      </header>
      <StudioEditor
        // Remount with fresh state if the saved version changes underneath.
        key={`${l.id}-${l.updatedAt.getTime()}`}
        layout={{
          id: l.id,
          name: l.name,
          floorWidth: l.floorWidth,
          floorDepth: l.floorDepth,
          rows: l.doc.rows,
          clearHeight: l.clearHeight,
          dockDoors: l.dockDoors,
        }}
      />
    </>
  );
}
