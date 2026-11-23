import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import { PageHeader } from "@/components/app/page-header";
import { ProjectStatusBadge } from "@/components/app/project-status";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { listProjects } from "@/lib/data/projects";
import { formatDate } from "@/lib/format";

export const metadata: Metadata = { title: "Projects" };

export default function ProjectsPage() {
  return (
    <>
      <PageHeader title="Projects" description="Each project groups the sites and data for one client." />
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
  return (
    <Card className="py-0">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="pl-4">Code</TableHead>
            <TableHead>Project</TableHead>
            <TableHead className="hidden md:table-cell">Industry</TableHead>
            <TableHead className="text-right">Sites</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="hidden pr-4 sm:table-cell">Started</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {projects.map((p) => (
            <TableRow key={p.id}>
              <TableCell className="pl-4 font-mono text-xs text-muted-foreground">{p.code}</TableCell>
              <TableCell>
                <Link href={`/projects/${p.id}`} className="font-medium hover:underline">
                  {p.name}
                </Link>
                <div className="text-xs text-muted-foreground">{p.client}</div>
              </TableCell>
              <TableCell className="hidden md:table-cell">{p.industry}</TableCell>
              <TableCell className="text-right tabular-nums">{p.siteCount}</TableCell>
              <TableCell>
                <ProjectStatusBadge status={p.status} />
              </TableCell>
              <TableCell className="hidden pr-4 text-muted-foreground sm:table-cell">
                {formatDate(p.startedOn)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Card>
  );
}
