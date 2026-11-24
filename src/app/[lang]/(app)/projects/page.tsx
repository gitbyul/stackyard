import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import { PageHeader } from "@/components/app/page-header";
import { ProjectStatusBadge } from "@/components/app/project-status";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { listProjects } from "@/lib/data/projects";
import { localePath } from "@/i18n/config";
import { getDictionary, getLocale } from "@/i18n/server";
import { formatFor } from "@/lib/format";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getDictionary()).projects.title };
}

export default async function ProjectsPage() {
  const t = (await getDictionary()).projects;
  return (
    <>
      <PageHeader title={t.title} description={t.description} />
      <div className="p-6">
        <Suspense fallback={<Skeleton className="h-72 w-full" />}>
          <ProjectsTable />
        </Suspense>
      </div>
    </>
  );
}

async function ProjectsTable() {
  const projects = await listProjects();
  const locale = await getLocale();
  const dict = await getDictionary(locale);
  const t = dict.projects;
  const industryName = (name: string) => dict.industries[name as keyof typeof dict.industries] ?? name;
  const f = formatFor(locale);
  return (
    <Card className="py-0">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="pl-4">{t.code}</TableHead>
            <TableHead>{t.project}</TableHead>
            <TableHead className="hidden md:table-cell">{t.industry}</TableHead>
            <TableHead className="text-right">{t.sites}</TableHead>
            <TableHead>{t.status}</TableHead>
            <TableHead className="hidden pr-4 sm:table-cell">{t.started}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {projects.map((p) => (
            <TableRow key={p.id}>
              <TableCell className="pl-4 font-mono text-xs text-muted-foreground">{p.code}</TableCell>
              <TableCell>
                <Link href={localePath(locale, `/projects/${p.id}`)} className="font-medium hover:underline">
                  {p.name}
                </Link>
                <div className="text-xs text-muted-foreground">{p.client}</div>
              </TableCell>
              <TableCell className="hidden md:table-cell">{industryName(p.industry)}</TableCell>
              <TableCell className="text-right tabular-nums">{p.siteCount}</TableCell>
              <TableCell>
                <ProjectStatusBadge status={p.status} />
              </TableCell>
              <TableCell className="hidden pr-4 text-muted-foreground sm:table-cell">
                {f.date(p.startedOn)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Card>
  );
}
