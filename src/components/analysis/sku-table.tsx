"use client";

import { Download } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import type { AbcClass, AbcItem, AbcMetric } from "@/lib/analysis/abc";
import { AbcBadge } from "./abc-badge";

const PAGE = 25;
const nf = new Intl.NumberFormat("en-US");
const pf = (v: number) => `${(v * 100).toFixed(1)}%`;

function toCsv(items: AbcItem[], metric: AbcMetric) {
  const head = ["rank", "class", "sku", "name", "category", "units", "order_lines", "orders", `share_${metric}`, "cumulative_share"];
  const esc = (v: string | number) => {
    const s = String(v);
    return /[",\n]/.test(s) ? `"${s.replaceAll('"', '""')}"` : s;
  };
  const rows = items.map((it) =>
    [it.rank, it.cls, it.code, it.name, it.category, it.units, it.lines, it.orders, it.share.toFixed(6), it.cumShare.toFixed(6)]
      .map(esc)
      .join(","),
  );
  return [head.join(","), ...rows].join("\n");
}

export function SkuTable({
  items,
  metric,
  fileName,
}: {
  items: AbcItem[];
  metric: AbcMetric;
  fileName: string;
}) {
  const [cls, setCls] = useState<"all" | AbcClass>("all");
  const [limit, setLimit] = useState(PAGE);

  const filtered = cls === "all" ? items : items.filter((it) => it.cls === cls);
  const visible = filtered.slice(0, limit);

  function download() {
    const blob = new Blob([toCsv(items, metric)], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = Object.assign(document.createElement("a"), { href: url, download: fileName });
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 pt-4">
        <ToggleGroup
          type="single"
          variant="outline"
          size="sm"
          value={cls}
          onValueChange={(v) => {
            if (!v) return;
            setCls(v as typeof cls);
            setLimit(PAGE);
          }}
          aria-label="Filter by class"
        >
          <ToggleGroupItem value="all" className="px-3">
            All
          </ToggleGroupItem>
          {(["A", "B", "C"] as const).map((c) => (
            <ToggleGroupItem key={c} value={c} className="px-3">
              Class {c}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
        <Button variant="outline" size="sm" onClick={download}>
          <Download /> Export CSV
        </Button>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-14 pl-4 text-right">Rank</TableHead>
            <TableHead className="w-12">Class</TableHead>
            <TableHead>SKU</TableHead>
            <TableHead className="hidden lg:table-cell">Category</TableHead>
            <TableHead className="text-right">Units</TableHead>
            <TableHead className="text-right">Lines</TableHead>
            <TableHead className="hidden text-right sm:table-cell">Share</TableHead>
            <TableHead className="pr-4 text-right">Cumulative</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {visible.map((it) => (
            <TableRow key={it.skuId}>
              <TableCell className="pl-4 text-right tabular-nums text-muted-foreground">{it.rank}</TableCell>
              <TableCell>
                <AbcBadge cls={it.cls} />
              </TableCell>
              <TableCell>
                <div className="font-mono text-xs">{it.code}</div>
                <div className="text-xs text-muted-foreground">{it.name}</div>
              </TableCell>
              <TableCell className="hidden text-muted-foreground lg:table-cell">{it.category}</TableCell>
              <TableCell className={`text-right tabular-nums ${metric === "units" ? "font-medium" : ""}`}>
                {nf.format(it.units)}
              </TableCell>
              <TableCell className={`text-right tabular-nums ${metric === "lines" ? "font-medium" : ""}`}>
                {nf.format(it.lines)}
              </TableCell>
              <TableCell className="hidden text-right tabular-nums sm:table-cell">{pf(it.share)}</TableCell>
              <TableCell className="pr-4 text-right tabular-nums">{pf(it.cumShare)}</TableCell>
            </TableRow>
          ))}
          {visible.length === 0 && (
            <TableRow>
              <TableCell colSpan={8} className="py-8 text-center text-muted-foreground">
                No SKUs in this class.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>

      {filtered.length > limit && (
        <div className="flex justify-center pb-4">
          <Button variant="ghost" size="sm" onClick={() => setLimit(filtered.length)}>
            Show all {filtered.length} SKUs
          </Button>
        </div>
      )}
    </div>
  );
}
