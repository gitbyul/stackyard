"use client";

import { AlertTriangle } from "lucide-react";
import { useEffect, useRef } from "react";

import { cn } from "@/lib/utils";
import { fill, useI18n } from "@/i18n/client";
import { useStudio } from "./store";

export function RowList({ flagged }: { flagged: Set<string> }) {
  const rows = useStudio((s) => s.rows);
  const selectedId = useStudio((s) => s.selectedId);
  const select = useStudio((s) => s.select);
  const hover = useStudio((s) => s.hover);
  const listRef = useRef<HTMLUListElement>(null);
  const { t } = useI18n();

  // Keep the selected row visible when it's picked in the 3D view.
  useEffect(() => {
    if (!selectedId) return;
    listRef.current
      ?.querySelector<HTMLElement>(`[data-row-id="${CSS.escape(selectedId)}"]`)
      ?.scrollIntoView({ block: "nearest" });
  }, [selectedId]);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <h2 className="px-4 pb-2 pt-4 text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {fill(t.studio.rowsCount, { n: rows.length })}
      </h2>
      <ul ref={listRef} className="min-h-0 flex-1 overflow-y-auto px-2 pb-4">
        {rows.map((r) => (
          <li key={r.id} data-row-id={r.id}>
            <button
              type="button"
              onClick={() => select(r.id)}
              onPointerEnter={() => hover(r.id)}
              onPointerLeave={() => hover(null)}
              aria-current={r.id === selectedId}
              className={cn(
                "flex w-full items-center justify-between gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-accent",
                r.id === selectedId && "bg-signal/20 hover:bg-signal/25",
              )}
            >
              <span className="flex items-center gap-1.5 font-mono text-xs">
                {flagged.has(r.id) && <AlertTriangle className="size-3.5 text-destructive" aria-label={t.studio.hasIssues} />}
                {r.name}
              </span>
              <span className="text-xs tabular-nums text-muted-foreground">
                {r.bays}×{r.levels}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
