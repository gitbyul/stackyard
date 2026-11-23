import type { AbcClassSummary } from "@/lib/analysis/abc";
import { ABC_FILL, ABC_INK } from "./abc-colors";

/** Narrower parts can't fit their label; the table and title carry the value. */
const MIN_LABEL_SHARE = 0.08;

function SegmentedBar({
  label,
  parts,
}: {
  label: string;
  parts: { cls: AbcClassSummary["cls"]; share: number; detail: string }[];
}) {
  return (
    <div className="space-y-1.5">
      <p className="text-xs text-muted-foreground">{label}</p>
      <div
        className="flex h-7 gap-0.5"
        role="img"
        aria-label={`${label}: ${parts.map((p) => `class ${p.cls} ${(p.share * 100).toFixed(1)}%`).join(", ")}`}
      >
        {parts
          .filter((p) => p.share > 0)
          .map((p) => (
            <div
              key={p.cls}
              title={`Class ${p.cls}: ${(p.share * 100).toFixed(1)}% (${p.detail})`}
              className="flex items-center rounded px-2 text-xs font-semibold tabular-nums"
              style={{ flexGrow: p.share, flexBasis: 0, background: ABC_FILL[p.cls], color: ABC_INK[p.cls] }}
            >
              {p.share >= MIN_LABEL_SHARE && `${Math.round(p.share * 100)}%`}
            </div>
          ))}
      </div>
    </div>
  );
}

/** The classic ABC story: a small share of SKUs carries most of the movement. */
export function ClassShareBars({
  summary,
  metricLabel,
}: {
  summary: AbcClassSummary[];
  metricLabel: string;
}) {
  return (
    <div className="space-y-4">
      <SegmentedBar
        label="Share of SKUs"
        parts={summary.map((s) => ({ cls: s.cls, share: s.skuShare, detail: `${s.skuCount} SKUs` }))}
      />
      <SegmentedBar
        label={`Share of ${metricLabel.toLowerCase()}`}
        parts={summary.map((s) => ({
          cls: s.cls,
          share: s.valueShare,
          detail: s.value.toLocaleString("en-US"),
        }))}
      />
      <div className="flex gap-4 text-xs text-muted-foreground">
        {summary.map((s) => (
          <span key={s.cls} className="flex items-center gap-1.5">
            <span className="size-2.5 rounded-sm" style={{ background: ABC_FILL[s.cls] }} />
            Class {s.cls}
          </span>
        ))}
      </div>
    </div>
  );
}
