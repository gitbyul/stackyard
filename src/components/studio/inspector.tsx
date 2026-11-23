"use client";

import { AlertTriangle, CheckCircle2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { palletPositions, rowLength, type RackRow } from "@/lib/layout/model";
import type { LayoutStats } from "@/lib/layout/stats";
import { useStudio } from "./store";

const nf = new Intl.NumberFormat("en-US");

/**
 * Number input that edits a draft and commits on Enter or blur. Keyed by the
 * external value so undo/redo and dragging refresh what's shown.
 */
function NumberField({
  id,
  label,
  value,
  step,
  min,
  max,
  suffix,
  integer,
  onCommit,
}: {
  id: string;
  label: string;
  value: number;
  step: number;
  min: number;
  max: number;
  suffix?: string;
  integer?: boolean;
  onCommit: (v: number) => void;
}) {
  const commit = (raw: string, el: HTMLInputElement) => {
    const n = Number(raw);
    if (!Number.isFinite(n) || raw.trim() === "") {
      el.value = String(value);
      return;
    }
    const v = Math.min(max, Math.max(min, integer ? Math.round(n) : n));
    if (v !== value) onCommit(v);
    else el.value = String(value);
  };
  return (
    <div className="space-y-1">
      <Label htmlFor={id} className="text-xs text-muted-foreground">
        {label}
        {suffix && <span className="ml-1 opacity-70">({suffix})</span>}
      </Label>
      <Input
        key={value}
        id={id}
        type="number"
        inputMode="decimal"
        defaultValue={value}
        step={step}
        min={min}
        max={max}
        className="h-8 tabular-nums"
        onBlur={(e) => commit(e.currentTarget.value, e.currentTarget)}
        onKeyDown={(e) => {
          if (e.key === "Enter") e.currentTarget.blur();
          if (e.key === "Escape") {
            e.currentTarget.value = String(value);
            e.currentTarget.blur();
          }
        }}
      />
    </div>
  );
}

function RowInspector({ row }: { row: RackRow }) {
  const updateRow = useStudio((s) => s.updateRow);
  const set = (patch: Partial<RackRow>) => updateRow(row.id, patch);
  const f = (k: string) => `insp-${k}`;

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <Label htmlFor={f("name")} className="text-xs text-muted-foreground">
          Name
        </Label>
        <Input
          key={row.name}
          id={f("name")}
          defaultValue={row.name}
          maxLength={32}
          className="h-8 font-mono"
          onBlur={(e) => {
            const v = e.currentTarget.value.trim();
            if (v && v !== row.name) set({ name: v });
            else e.currentTarget.value = row.name;
          }}
          onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <NumberField id={f("x")} label="X" suffix="m" value={row.x} step={0.1} min={0} max={1000} onCommit={(x) => set({ x })} />
        <NumberField id={f("z")} label="Z" suffix="m" value={row.z} step={0.1} min={0} max={1000} onCommit={(z) => set({ z })} />
        <NumberField id={f("bays")} label="Bays" value={row.bays} step={1} min={1} max={200} integer onCommit={(bays) => set({ bays })} />
        <NumberField id={f("levels")} label="Levels" value={row.levels} step={1} min={1} max={12} integer onCommit={(levels) => set({ levels })} />
        <NumberField id={f("bw")} label="Bay width" suffix="m" value={row.bayWidth} step={0.1} min={1} max={5} onCommit={(bayWidth) => set({ bayWidth })} />
        <NumberField id={f("d")} label="Depth" suffix="m" value={row.depth} step={0.1} min={0.6} max={2} onCommit={(depth) => set({ depth })} />
        <NumberField id={f("lh")} label="Level height" suffix="m" value={row.levelHeight} step={0.1} min={0.8} max={3} onCommit={(levelHeight) => set({ levelHeight })} />
        <div className="space-y-1">
          <span className="text-xs text-muted-foreground">Rotation</span>
          <Button
            variant="outline"
            size="sm"
            className="h-8 w-full justify-start tabular-nums"
            onClick={() => set({ rotation: row.rotation === 0 ? 90 : 0 })}
          >
            {row.rotation}°
          </Button>
        </div>
      </div>
      <dl className="grid grid-cols-2 gap-2 rounded-md bg-muted/60 p-3 text-xs">
        <dt className="text-muted-foreground">Length</dt>
        <dd className="text-right tabular-nums">{rowLength(row).toFixed(1)} m</dd>
        <dt className="text-muted-foreground">Height</dt>
        <dd className="text-right tabular-nums">{(row.levels * row.levelHeight).toFixed(1)} m</dd>
        <dt className="text-muted-foreground">Pallet positions</dt>
        <dd className="text-right font-medium tabular-nums">{nf.format(palletPositions(row))}</dd>
      </dl>
    </div>
  );
}

export function Inspector({ stats, clearHeight }: { stats: LayoutStats; clearHeight: number }) {
  const row = useStudio((s) => s.rows.find((r) => r.id === s.selectedId));
  const rowsById = useStudio((s) => s.rows);
  const select = useStudio((s) => s.select);
  const nameOf = (id: string) => rowsById.find((r) => r.id === id)?.name ?? id;
  const tooTall = row && row.levels * row.levelHeight > clearHeight - 0.5;

  return (
    <div className="space-y-6 p-4">
      <section className="space-y-3">
        <h2 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {row ? `Row ${row.name}` : "Selection"}
        </h2>
        {row ? (
          <>
            <RowInspector row={row} />
            {tooTall && (
              <p className="flex gap-2 text-xs text-destructive">
                <AlertTriangle className="size-4 shrink-0" />
                Taller than the {clearHeight} m clear height minus 0.5 m sprinkler clearance.
              </p>
            )}
          </>
        ) : (
          <p className="text-sm text-muted-foreground">
            Click a rack row to edit it, or drag it to move. Hold the right mouse button to pan.
          </p>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Layout</h2>
        <dl className="grid grid-cols-2 gap-x-3 gap-y-2 text-sm">
          <dt className="text-muted-foreground">Pallet positions</dt>
          <dd className="text-right font-semibold tabular-nums">{nf.format(stats.positions)}</dd>
          <dt className="text-muted-foreground">Rows / bays</dt>
          <dd className="text-right tabular-nums">
            {nf.format(stats.rows)} / {nf.format(stats.bays)}
          </dd>
          <dt className="text-muted-foreground">Floor coverage</dt>
          <dd className="text-right tabular-nums">{(stats.coverage * 100).toFixed(1)}%</dd>
          <dt className="text-muted-foreground">Density</dt>
          <dd className="text-right tabular-nums">{nf.format(Math.round(stats.density))} / 1,000 m²</dd>
        </dl>
      </section>

      <section className="space-y-2">
        <h2 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Checks</h2>
        {stats.issues.length === 0 ? (
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <CheckCircle2 className="size-4 text-chart-4" /> No overlaps; every row is inside the building.
          </p>
        ) : (
          <ul className="space-y-1">
            {stats.issues.slice(0, 8).map((issue) => (
              <li key={`${issue.kind}-${issue.rowIds.join("-")}`}>
                <button
                  type="button"
                  className="flex w-full items-start gap-2 rounded px-1 py-0.5 text-left text-sm hover:bg-accent"
                  onClick={() => select(issue.rowIds[0])}
                >
                  <AlertTriangle className="mt-0.5 size-4 shrink-0 text-destructive" />
                  {issue.kind === "overlap"
                    ? `${nameOf(issue.rowIds[0])} overlaps ${nameOf(issue.rowIds[1]!)}`
                    : `${nameOf(issue.rowIds[0])} is outside the building`}
                </button>
              </li>
            ))}
            {stats.issues.length > 8 && (
              <li className="px-1 text-xs text-muted-foreground">and {stats.issues.length - 8} more</li>
            )}
          </ul>
        )}
      </section>
    </div>
  );
}
