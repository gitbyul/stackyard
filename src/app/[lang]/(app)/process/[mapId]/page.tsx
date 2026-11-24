import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import { MapEditor } from "@/components/process/map-editor";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Skeleton } from "@/components/ui/skeleton";
import { LanguageSwitcher } from "@/components/app/language-switcher";
import { localePath } from "@/i18n/config";
import { getDictionary, getLocale } from "@/i18n/server";
import { getProcessMap } from "@/lib/data/process-maps";

export async function generateMetadata({ params }: PageProps<"/[lang]/process/[mapId]">): Promise<Metadata> {
  const { mapId } = await params;
  return { title: (await getProcessMap(mapId)).name };
}

export default function ProcessMapPage({ params }: PageProps<"/[lang]/process/[mapId]">) {
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

async function ProcessMap({ params }: Pick<PageProps<"/[lang]/process/[mapId]">, "params">) {
  const { mapId } = await params;
  const map = await getProcessMap(mapId);
  const locale = await getLocale();
  const dict = await getDictionary(locale);
  const t = dict.process;
  return (
    <>
      <header className="flex h-12 shrink-0 items-center gap-2 border-b px-4 text-sm">
        <SidebarTrigger className="-ml-1" label={dict.a11y.toggleSidebar} />
        <Separator orientation="vertical" className="mr-1 data-[orientation=vertical]:h-4" />
        <nav aria-label={dict.common.breadcrumb} className="flex min-w-0 items-center gap-1.5 text-muted-foreground">
          <Link href={localePath(locale, "/process")} className="hover:text-foreground">
            {t.breadcrumb}
          </Link>
          <span>/</span>
          <Link href={localePath(locale, `/projects/${map.projectId}`)} className="truncate hover:text-foreground">
            {map.projectName}
          </Link>
          <span>/</span>
          <span className="truncate font-medium text-foreground">{map.name}</span>
        </nav>
        <div className="ml-auto">
          <LanguageSwitcher compact />
        </div>
      </header>
      <MapEditor
        key={map.id}
        mapId={map.id}
        versions={map.versions.map((v) => ({ ...v, createdAt: v.createdAt.toISOString() }))}
      />
    </>
  );
}
