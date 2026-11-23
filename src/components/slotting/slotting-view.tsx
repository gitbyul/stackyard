"use client";

import { Download, LoaderCircle, Map as MapIcon, Rotate3d } from "lucide-react";
import dynamic from "next/dynamic";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState, useTransition } from "react";

import { AbcBadge } from "@/components/analysis/abc-badge";
import { ABC_FILL } from "@/components/analysis/abc-colors";
import type { CameraView } from "@/components/three/site-floor";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import type { Floor, RackRow } from "@/lib/layout/model";
import type { SlottingRequest } from "@/lib/slotting/run";
import type { Assignment } from "@/lib/slotting/solve";
import { cn } from "@/lib/utils";
import { useSlotting } from "./use-slotting";

const SlotScene = dynamic(() => import("./slot-scene").then((m) => m.SlotScene), {
  ssr: false,
  loading: () => <Skeleton className="size-full rounded-none" />,
});

export type LayoutOption = { id: string; name: string; projectName: string };

const nf = new Intl.NumberFormat("en-US");
const PAGE = 25;
const STRATEGIES = [
  { value: "coi", label: "Cube-per-order" },
  { value: "velocity", label: "Pick velocity" },
] as const;
/** Weeks of average demand to hold; typical DC cover runs 2–8 weeks. */
const COVERS = [
  { days: 14, label: "2 wks" },
  { days: 28, label: "4 wks" },
  { days: 56, label: "8 wks" },
] as const;

function Field({ label, htmlFor, children }: { label: string; htmlFor?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={htmlFor} className="text-xs text-muted-foreground">
        {label}
      </Label>
      {children}
    </div>
  );
}

function Stat({ label, value, hint }: { label: string; value: React.ReactNode; hint?: React.ReactNode }) {
  return (
    <Card className="gap-2">
      <CardHeader>
        <CardDescription>{label}</CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-3xl font-semibold tracking-tight">{value}</p>
        {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
      </CardContent>
    </Card>
  );
}

function toCsv(assignments: Assignment[], codes: (i: number) => string) {
  const head = ["sku", "name", "class", "pick_lines", "units", "positions", "avg_trip_m", "locations"];
  const esc = (v: string | number) => {
    const s = String(v);
    return /[",\n]/.test(s) ? `"${s.replaceAll('"', '""')}"` : s;
  };
  const rows = assignments.map((a) =>
    [a.sku.code, a.sku.name, a.sku.cls, a.sku.lines, a.sku.units, a.locations.length, a.cost.toFixed(1), a.locations.map(codes).join(" ")]
      .map(esc)
      .join(","),
  );
  return [head.join(","), ...rows].join("\n");
}

export function SlottingView({
  layouts,
  layoutId,
  period,
  rangeLabel,
  rows,
  floor,
  dockDoors,
  skus,
}: {
  layouts: LayoutOption[];
  layoutId: string;
  period: number;
  rangeLabel: string;
  rows: RackRow[];
  floor: Floor;
  dockDoors: number;
  skus: SlottingRequest["skus"];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [navigating, startNav] = useTransition();
  const [strategy, setStrategy] = useState<SlottingRequest["strategy"]>("coi");
  const [cover, setCover] = useState(28);
  const [view, setView] = useState<{ view: CameraView; n: number }>({ view: "perspective", n: 0 });
  const [limit, setLimit] = useState(PAGE);

  const request = useMemo<SlottingRequest>(
    () => ({ rows, floor, dockDoors, periodDays: period, coverDays: cover, strategy, skus }),
    [rows, floor, dockDoors, period, cover, strategy, skus],
  );
  const { response, ms, inWorker, running } = useSlotting(request);

  const navigate = (key: "layout" | "period", value: string) => {
    if (!value) return;
    const params = new URLSearchParams(searchParams);
    params.set(key, value);
    startNav(() => router.replace(`${pathname}?${params}`, { scroll: false }));
  };

  const plan = response?.plan;
  const base = response?.baseline;
  const saving = plan && base && base.travelPerPick > 0 ? 1 - plan.travelPerPick / base.travelPerPick : 0;
  const byLines = useMemo(
    () => (plan ? [...plan.assignments].sort((a, b) => b.sku.lines - a.sku.lines) : []),
    [plan],
  );
  const codeOf = (i: number) => response?.locations[i]?.code ?? "";
  const busy = running || navigating;

  function download() {
    if (!plan) return;
    const blob = new Blob([toCsv(byLines, codeOf)], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const name = layouts.find((l) => l.id === layoutId)?.name ?? "layout";
    const a = Object.assign(document.createElement("a"), {
      href: url,
      download: `slotting-${name.toLowerCase().replaceAll(/[^a-z0-9]+/g, "-")}-${strategy}.csv`,
    });
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <>
      <div className="flex flex-wrap items-end gap-x-6 gap-y-4 px-6 pt-4">
        <Field label="Layout" htmlFor="slot-layout">
          <Select value={layoutId} onValueChange={(v) => navigate("layout", v)}>
            <SelectTrigger id="slot-layout" className="w-72">
              <SelectValue>{layouts.find((l) => l.id === layoutId)?.name}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              {layouts.map((l) => (
                <SelectItem key={l.id} value={l.id}>
                  {l.name}
                  <span className="ml-2 text-xs text-muted-foreground">{l.projectName}</span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Field label="Demand period">
          <ToggleGroup type="single" variant="outline" value={String(period)} onValueChange={(v) => navigate("period", v)}>
            {["30", "60", "90"].map((d) => (
              <ToggleGroupItem key={d} value={d} className="px-3">
                {d} days
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        </Field>
        <Field label="Strategy">
          <ToggleGroup
            type="single"
            variant="outline"
            value={strategy}
            onValueChange={(v) => v && setStrategy(v as typeof strategy)}
          >
            {STRATEGIES.map((s) => (
              <ToggleGroupItem key={s.value} value={s.value} className="px-3">
                {s.label}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        </Field>
        <Field label="Stock cover">
          <ToggleGroup type="single" variant="outline" value={String(cover)} onValueChange={(v) => v && setCover(Number(v))}>
            {COVERS.map((c) => (
              <ToggleGroupItem key={c.days} value={String(c.days)} className="px-3">
                {c.label}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        </Field>
      </div>

      <div className={cn("space-y-6 p-6 transition-opacity", busy && plan && "opacity-60")} aria-busy={busy}>
        <p className="flex items-center gap-2 text-xs text-muted-foreground">
          {rangeLabel}
          {busy ? (
            <span className="flex items-center gap-1">
              <LoaderCircle className="size-3 animate-spin" /> Solving…
            </span>
          ) : (
            ms !== null && (
              <span>
                · solved in {ms < 1 ? "<1" : Math.round(ms)} ms {inWorker ? "in a Web Worker" : "on the main thread"}
              </span>
            )
          )}
        </p>

        {!plan || !base ? (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {Array.from({ length: 4 }, (_, i) => (
              <Skeleton key={i} className="h-32" />
            ))}
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <Card className="gap-2 sm:col-span-2">
              <CardHeader>
                <CardDescription>Travel per pick vs. slotting by SKU code</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-5xl font-semibold tracking-tight">
                  {saving > 0 ? "−" : ""}
                  {Math.abs(Math.round(saving * 100))}%
                </p>
                <p className="mt-2 text-sm text-muted-foreground">
                  {nf.format(Math.round(plan.travelPerPick))} m per pick, down from {nf.format(Math.round(base.travelPerPick))} m
                  (round trip from the nearest dock door, lift counted double).
                </p>
              </CardContent>
            </Card>
            <Stat
              label="Positions used"
              value={`${nf.format(plan.positionsUsed)} / ${nf.format(plan.positionsTotal)}`}
              hint={
                plan.unslotted.length > 0
                  ? `${plan.unslotted.length} SKUs didn't fit; add racking or shorten cover`
                  : `${Math.round((plan.positionsUsed / Math.max(1, plan.positionsTotal)) * 100)}% of the layout`
              }
            />
            <Stat
              label="Picks from ground levels"
              value={`${Math.round(plan.groundShare * 100)}%`}
              hint={`Levels 0–1, no lift needed · baseline ${Math.round(base.groundShare * 100)}%`}
            />
          </div>
        )}

        <Card className="gap-0 overflow-hidden py-0">
          <CardHeader className="flex-row items-start justify-between gap-4 py-4">
            <div className="space-y-1.5">
              <CardTitle>Slot plan</CardTitle>
              <CardDescription>
                Each load is one assigned pallet position, coloured by the SKU&apos;s ABC class (order lines). Hover for
                details.
              </CardDescription>
            </div>
            <div className="flex shrink-0 gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="size-8"
                aria-label="Top view"
                onClick={() => setView((v) => ({ view: "top", n: v.n + 1 }))}
              >
                <MapIcon />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="size-8"
                aria-label="Perspective view"
                onClick={() => setView((v) => ({ view: "perspective", n: v.n + 1 }))}
              >
                <Rotate3d />
              </Button>
            </div>
          </CardHeader>
          <div className="relative h-[26rem] border-t">
            {response && plan ? (
              <SlotScene
                rows={rows}
                floor={floor}
                dockDoors={dockDoors}
                locations={response.locations}
                assignments={plan.assignments}
                view={view.view}
                viewKey={view.n}
              />
            ) : (
              <Skeleton className="size-full rounded-none" />
            )}
            <div className="pointer-events-none absolute bottom-2 left-2 flex gap-3 rounded bg-background/80 px-2 py-1 text-[11px] text-muted-foreground backdrop-blur">
              {(["A", "B", "C"] as const).map((c) => (
                <span key={c} className="flex items-center gap-1.5">
                  <span className="size-2.5 rounded-sm" style={{ background: ABC_FILL[c] }} />
                  Class {c}
                </span>
              ))}
              <span>· docks on the near wall</span>
            </div>
          </div>
        </Card>

        <Card className="gap-0 py-0">
          <CardHeader className="flex-row items-start justify-between gap-4 pt-6">
            <div className="space-y-1.5">
              <CardTitle>Assignments</CardTitle>
              <CardDescription>Busiest SKUs first. The export lists every position.</CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={download} disabled={!plan}>
              <Download /> Export CSV
            </Button>
          </CardHeader>
          <Table className="mt-4">
            <TableHeader>
              <TableRow>
                <TableHead className="w-12 pl-4">Class</TableHead>
                <TableHead>SKU</TableHead>
                <TableHead className="text-right">Pick lines</TableHead>
                <TableHead className="text-right">Positions</TableHead>
                <TableHead className="hidden md:table-cell">Locations</TableHead>
                <TableHead className="pr-4 text-right">Avg trip</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {byLines.slice(0, limit).map((a) => (
                <TableRow key={a.sku.skuId}>
                  <TableCell className="pl-4">
                    <AbcBadge cls={a.sku.cls} />
                  </TableCell>
                  <TableCell>
                    <div className="font-mono text-xs">{a.sku.code}</div>
                    <div className="text-xs text-muted-foreground">{a.sku.name}</div>
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{nf.format(a.sku.lines)}</TableCell>
                  <TableCell className="text-right tabular-nums">{a.locations.length}</TableCell>
                  <TableCell className="hidden font-mono text-xs text-muted-foreground md:table-cell">
                    {codeOf(a.locations[0])}
                    {a.locations.length > 1 && ` +${a.locations.length - 1}`}
                  </TableCell>
                  <TableCell className="pr-4 text-right tabular-nums">{Math.round(a.cost)} m</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {byLines.length > limit && (
            <div className="flex justify-center py-3">
              <Button variant="ghost" size="sm" onClick={() => setLimit(byLines.length)}>
                Show all {byLines.length} SKUs
              </Button>
            </div>
          )}
        </Card>
      </div>
    </>
  );
}
