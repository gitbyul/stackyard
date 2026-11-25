"use client";

import { AlertCircle, CheckCircle2, FileUp, Upload } from "lucide-react";
import { useRouter } from "next/navigation";
import { useId, useRef, useState, useTransition } from "react";
import { toast } from "sonner";

import { importDataset } from "@/app/[lang]/(app)/data/actions";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { fill, useI18n } from "@/i18n/client";
import {
  COLUMNS,
  fieldOf,
  IMPORT_MODES,
  MAX_IMPORT_BYTES,
  MAX_IMPORT_ROWS,
  parseDataset,
  type DatasetKind,
  type ImportMode,
  type Issue,
  type ParseResult,
} from "@/lib/import/datasets";
import { cn } from "@/lib/utils";
import { issueText, issueWhere } from "./issue-text";

const PREVIEW_ROWS = 5;
const SHOWN_ISSUES = 30;
const MB = (MAX_IMPORT_BYTES / 1024 / 1024).toFixed(1);

type Loaded = { name: string; size: number; text: string; result: ParseResult<DatasetKind> };

/**
 * Pick or drop a CSV, check it in the browser (same parser as the server),
 * preview the first rows and choose how it combines with existing data.
 * The server validates again before writing anything.
 */
export function ImportDialog({ siteId, kind }: { siteId: string; kind: DatasetKind }) {
  const { t: dict, fmt } = useI18n();
  const t = dict.data;
  const router = useRouter();
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [reading, setReading] = useState(false);
  const [tooBig, setTooBig] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [mode, setMode] = useState<ImportMode>(IMPORT_MODES[kind][0]);
  const [serverIssues, setServerIssues] = useState<{ issues: Issue[]; issueCount: number } | null>(null);
  const [pending, startTransition] = useTransition();

  const dataset = t.datasets[kind].title;
  const columns = COLUMNS[kind];

  const reset = () => {
    setLoaded(null);
    setTooBig(false);
    setServerIssues(null);
    setMode(IMPORT_MODES[kind][0]);
    if (inputRef.current) inputRef.current.value = "";
  };

  const readFile = async (file: File | undefined) => {
    if (!file) return;
    setServerIssues(null);
    setLoaded(null);
    setTooBig(file.size > MAX_IMPORT_BYTES);
    if (file.size > MAX_IMPORT_BYTES) return;
    setReading(true);
    try {
      const text = await file.text();
      setLoaded({ name: file.name, size: file.size, text, result: parseDataset(kind, text) });
    } finally {
      setReading(false);
    }
  };

  const submit = () => {
    if (!loaded) return;
    startTransition(async () => {
      try {
        const res = await importDataset(siteId, kind, mode, loaded.text);
        if (res.ok) {
          toast.success(t.import.done, {
            description: fill(t.import.doneDetail, {
              inserted: fmt.number(res.inserted),
              updated: fmt.number(res.updated),
              removed: fmt.number(res.removed),
            }),
          });
          setOpen(false);
          reset();
          router.refresh();
        } else if (res.error === "invalid") {
          setServerIssues({ issues: res.issues, issueCount: res.issueCount });
        } else if (res.error === "rowLimit") {
          toast.error(fill(t.errors.rowLimit, { limit: fmt.number(res.limit), total: fmt.number(res.total) }));
        } else {
          toast.error(t.errors[res.error]);
        }
      } catch {
        toast.error(t.errors.generic);
      }
    });
  };

  const result = loaded?.result;
  const issues = serverIssues ?? (result && result.issueCount > 0 ? result : null);
  const ready = !!result && result.issueCount === 0 && !serverIssues;
  const modeKey = kind === "skus" && mode === "replace" ? "replaceSkus" : mode;

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (pending) return;
        setOpen(next);
        if (!next) reset();
      }}
    >
      <DialogTrigger asChild>
        <Button size="sm">
          <Upload />
          {t.actions.import}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl" closeLabel={dict.a11y.close}>
        <DialogHeader>
          <DialogTitle>{fill(t.import.title, { dataset })}</DialogTitle>
          <DialogDescription>{t.import.body}</DialogDescription>
        </DialogHeader>

        <div className="flex flex-wrap gap-1.5">
          {columns.map((c) => (
            <code key={c.name} className="rounded bg-muted px-1.5 py-0.5 text-xs">
              {c.name}
            </code>
          ))}
        </div>

        <label
          htmlFor={inputId}
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            void readFile(e.dataTransfer.files[0]);
          }}
          className={cn(
            "flex cursor-pointer flex-col items-center gap-1 rounded-lg border border-dashed px-4 py-6 text-center transition-colors hover:bg-muted/50",
            dragging && "border-primary bg-primary/5",
          )}
        >
          <FileUp className="size-6 text-muted-foreground" aria-hidden />
          {loaded ? (
            <>
              <span className="text-sm font-medium">{loaded.name}</span>
              <span className="text-xs text-muted-foreground">
                {(loaded.size / 1024).toFixed(1)} KB · {t.import.other}
              </span>
            </>
          ) : (
            <>
              <span className="text-sm font-medium">{reading ? t.import.reading : t.import.choose}</span>
              <span className="text-xs text-muted-foreground">{t.import.drop}</span>
            </>
          )}
          <span className="mt-1 text-xs text-muted-foreground">
            {fill(t.import.limits, { rows: fmt.number(MAX_IMPORT_ROWS), mb: MB })}
          </span>
          <input
            ref={inputRef}
            id={inputId}
            type="file"
            accept=".csv,text/csv"
            className="sr-only"
            onChange={(e) => void readFile(e.target.files?.[0])}
          />
        </label>

        {tooBig && (
          <p className="flex items-center gap-2 text-sm text-destructive" role="alert">
            <AlertCircle className="size-4" aria-hidden />
            {fill(t.import.tooBig, { mb: MB })}
          </p>
        )}

        {result && (
          <div className="space-y-3">
            <p className="flex items-center gap-2 text-sm">
              {ready ? (
                <CheckCircle2 className="size-4 text-primary dark:text-signal" aria-hidden />
              ) : (
                <AlertCircle className="size-4 text-destructive" aria-hidden />
              )}
              {fill(t.import.valid, { valid: fmt.number(result.rows.length), total: fmt.number(result.total) })}
            </p>
            {result.extraColumns.length > 0 && (
              <p className="text-xs text-muted-foreground">
                {fill(t.import.extraColumns, { cols: result.extraColumns.join(", ") })}
              </p>
            )}
          </div>
        )}

        {issues && (
          <div className="rounded-lg border border-destructive/40" role="alert">
            <p className="border-b border-destructive/20 px-3 py-2 text-sm font-medium text-destructive">
              {serverIssues ? t.import.serverIssues : fill(t.import.issues, { n: fmt.number(issues.issueCount) })}
            </p>
            <ul className="max-h-56 space-y-1 overflow-y-auto px-3 py-2 text-sm">
              {issues.issues.slice(0, SHOWN_ISSUES).map((issue, i) => (
                <li key={i} className="flex gap-3">
                  <span className="w-16 shrink-0 tabular-nums text-muted-foreground">{issueWhere(t.issue, issue)}</span>
                  <span>{issueText(t.issue, kind, issue)}</span>
                </li>
              ))}
              {issues.issueCount > SHOWN_ISSUES && (
                <li className="text-muted-foreground">
                  {fill(t.import.moreIssues, { n: fmt.number(issues.issueCount - SHOWN_ISSUES) })}
                </li>
              )}
            </ul>
          </div>
        )}

        {ready && result.rows.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-medium">
              {t.import.preview}{" "}
              <span className="font-normal text-muted-foreground">
                {fill(t.import.previewNote, { n: Math.min(PREVIEW_ROWS, result.rows.length) })}
              </span>
            </p>
            <div className="overflow-x-auto rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    {columns.map((c) => (
                      <TableHead key={c.name} className="text-xs">
                        {c.name}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {result.rows.slice(0, PREVIEW_ROWS).map((row, i) => (
                    <TableRow key={i}>
                      {columns.map((c) => (
                        <TableCell key={c.name} className="max-w-48 truncate text-xs tabular-nums">
                          {String((row as Record<string, string | number>)[fieldOf(c.name)])}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        )}

        {ready && (
          <div className="space-y-2">
            <p className="text-sm font-medium">{t.import.mode}</p>
            <ToggleGroup
              type="single"
              variant="outline"
              value={mode}
              onValueChange={(v) => v && setMode(v as ImportMode)}
            >
              {IMPORT_MODES[kind].map((m) => (
                <ToggleGroupItem key={m} value={m} className="px-3">
                  {t.import.modes[m].label}
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
            <p className={cn("text-xs", mode === "replace" ? "text-destructive" : "text-muted-foreground")}>
              {t.import.modes[modeKey].body}
            </p>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={pending}>
            {t.actions.cancel}
          </Button>
          <Button
            onClick={submit}
            disabled={!ready || pending}
            variant={mode === "replace" ? "destructive" : "default"}
          >
            {pending ? t.import.importing : ready ? fill(t.import.submit, { n: fmt.number(result.rows.length) }) : t.actions.import}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
