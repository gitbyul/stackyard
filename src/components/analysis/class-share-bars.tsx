"use client";

import type { AbcClassSummary } from "@/lib/analysis/abc";
import { fill, useI18n } from "@/i18n/client";
import { ABC_FILL, ABC_INK } from "./abc-colors";

/** Narrower parts can't fit their label; the table and title carry the value. */
const MIN_LABEL_SHARE = 0.08;

function SegmentedBar({
  label,
  parts,
  classLabel,
}: {
  label: string;
  classLabel: string;
  parts: { cls: AbcClassSummary["cls"]; share: number; detail: string }[];
}) {
  return (
    <div className="space-y-1.5">
      <p className="text-xs text-muted-foreground">{label}</p>
      <div
        className="flex h-7 gap-0.5"
        role="img"
        aria-label={`${label}: ${parts.map((p) => `${fill(classLabel, { cls: p.cls })} ${(p.share * 100).toFixed(1)}%`).join(", ")}`}
      >
        {parts
          .filter((p) => p.share > 0)
          .map((p) => (
            <div
              key={p.cls}
              title={`${fill(classLabel, { cls: p.cls })}: ${(p.share * 100).toFixed(1)}% (${p.detail})`}
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
  const { t, fmt } = useI18n();
  const classLabel = t.common.classLabel;
  return (
    <div className="space-y-4">
      <SegmentedBar
        label={t.analysis.shares.skus}
        classLabel={classLabel}
        parts={summary.map((s) => ({
          cls: s.cls,
          share: s.skuShare,
          detail: fill(t.analysis.shares.skuCount, { n: fmt.number(s.skuCount) }),
        }))}
      />
      <SegmentedBar
        label={fill(t.analysis.shares.metric, { metric: metricLabel })}
        classLabel={classLabel}
        parts={summary.map((s) => ({
          cls: s.cls,
          share: s.valueShare,
          detail: fmt.number(s.value),
        }))}
      />
      <div className="flex gap-4 text-xs text-muted-foreground">
        {summary.map((s) => (
          <span key={s.cls} className="flex items-center gap-1.5">
            <span className="size-2.5 rounded-sm" style={{ background: ABC_FILL[s.cls] }} />
            {fill(classLabel, { cls: s.cls })}
          </span>
        ))}
      </div>
    </div>
  );
}
