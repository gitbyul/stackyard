"use client";

import { Download, FileSpreadsheet, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";

import { clearDataset, exportDataset } from "@/app/[lang]/(app)/data/actions";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { fill, useI18n } from "@/i18n/client";
import { toCsv } from "@/lib/import/csv";
import { COLUMNS, templateTable, type DatasetKind } from "@/lib/import/datasets";
import { downloadCsv, slug } from "./download";
import { ImportDialog } from "./import-dialog";

export type DatasetStats = {
  rows: number;
  from?: string | null;
  to?: string | null;
  orders?: number;
  units?: number;
  hours?: number;
};

const FILE_PART: Record<DatasetKind, string> = { skus: "skus", orderLines: "order-lines", laborLogs: "labour-logs" };

/** One dataset of a site: what is stored, its columns and the import/export actions. */
export function DatasetCard({
  siteId,
  siteName,
  kind,
  stats,
}: {
  siteId: string;
  siteName: string;
  kind: DatasetKind;
  stats: DatasetStats;
}) {
  const { t: dict, fmt } = useI18n();
  const t = dict.data;
  const router = useRouter();
  const [exporting, startExport] = useTransition();
  const [clearing, startClear] = useTransition();
  const title = t.datasets[kind].title;

  const facts = [
    stats.from && stats.to && fill(t.stats.range, { from: fmt.date(stats.from), to: fmt.date(stats.to) }),
    stats.orders !== undefined && stats.rows > 0 && fill(t.stats.orders, { n: fmt.number(stats.orders) }),
    stats.units !== undefined && stats.rows > 0 && fill(t.stats.units, { n: fmt.number(stats.units) }),
    stats.hours !== undefined && stats.rows > 0 && fill(t.stats.hours, { n: fmt.number(Math.round(stats.hours)) }),
  ].filter(Boolean);

  const onExport = () =>
    startExport(async () => {
      try {
        const res = await exportDataset(siteId, kind);
        if (res.ok) downloadCsv(`${slug(siteName)}-${FILE_PART[kind]}.csv`, res.csv);
        else toast.error(t.errors[res.error]);
      } catch {
        toast.error(t.errors.generic);
      }
    });

  const onClear = () =>
    startClear(async () => {
      try {
        const res = await clearDataset(siteId, kind);
        if (res.ok) {
          toast.success(fill(t.clear.done, { n: fmt.number(res.removed) }));
          router.refresh();
        } else toast.error(t.errors[res.error]);
      } catch {
        toast.error(t.errors.generic);
      }
    });

  return (
    <Card className="gap-4">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileSpreadsheet className="size-4 text-muted-foreground" aria-hidden />
          {title}
        </CardTitle>
        <CardDescription>{t.datasets[kind].body}</CardDescription>
      </CardHeader>
      <CardContent className="flex-1 space-y-4">
        <div>
          {stats.rows > 0 ? (
            <p className="text-3xl font-semibold tracking-tight tabular-nums">
              {fmt.number(stats.rows)}
              <span className="ml-1.5 text-sm font-normal text-muted-foreground">{t.stats.rows}</span>
            </p>
          ) : (
            <p className="py-1.5 text-sm text-muted-foreground">{t.stats.empty}</p>
          )}
          {facts.length > 0 && <p className="mt-1 text-xs text-muted-foreground">{facts.join(" · ")}</p>}
        </div>
        <div className="space-y-1.5">
          <p className="text-xs text-muted-foreground">{t.columns}</p>
          <div className="flex flex-wrap gap-1">
            {COLUMNS[kind].map((c) => (
              <code key={c.name} className="rounded bg-muted px-1.5 py-0.5 text-[11px]">
                {c.name}
              </code>
            ))}
          </div>
        </div>
      </CardContent>
      <CardFooter className="flex flex-wrap gap-2">
        <ImportDialog siteId={siteId} kind={kind} />
        <Button
          variant="outline"
          size="sm"
          onClick={() => downloadCsv(`stackyard-${FILE_PART[kind]}-template.csv`, toCsv(templateTable(kind)))}
        >
          <Download />
          {t.actions.template}
        </Button>
        <Button variant="outline" size="sm" onClick={onExport} disabled={exporting || stats.rows === 0}>
          <Download />
          {t.actions.export}
        </Button>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="ghost" size="sm" className="text-destructive" disabled={clearing || stats.rows === 0}>
              <Trash2 />
              {t.actions.clear}
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{fill(t.clear.title, { dataset: title })}</AlertDialogTitle>
              <AlertDialogDescription>
                {fill(t.clear.body, { n: fmt.number(stats.rows), site: siteName })}
                {kind === "skus" && ` ${t.clear.skusBody}`}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>{t.actions.cancel}</AlertDialogCancel>
              <AlertDialogAction variant="destructive" onClick={onClear}>
                {t.clear.confirm}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardFooter>
    </Card>
  );
}
