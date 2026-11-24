"use client";

import { fill, useI18n } from "@/i18n/client";
import { ABC_CLASSES } from "@/lib/analysis/abc";


/**
 * 3×3 cross-tab of units class (rows) vs order-lines class (columns). Cell
 * shade is a single-hue sequential scale of the SKU count; the number is
 * always printed, so the shade is never the only channel.
 */
export function CrossMatrix({ matrix, total }: { matrix: number[][]; total: number }) {
  const { t: dict } = useI18n();
  const t = dict.analysis.matrix;
  /** What each units × lines combination usually means for storage design. */
  const HINTS: Record<string, string> = t.hints;
  const max = Math.max(1, ...matrix.flat());
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-80 border-separate border-spacing-0.5 text-sm">
        <caption className="sr-only">{t.caption}</caption>
        <thead>
          <tr>
            <th scope="col" className="w-32 whitespace-nowrap text-left text-xs font-normal text-muted-foreground">
              {t.corner}
            </th>
            {ABC_CLASSES.map((c) => (
              <th key={c} scope="col" className="pb-1 text-xs font-medium text-muted-foreground">
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {ABC_CLASSES.map((r, ri) => (
            <tr key={r}>
              <th scope="row" className="pr-2 text-left text-xs font-medium text-muted-foreground">
                {r}
              </th>
              {ABC_CLASSES.map((c, ci) => {
                const n = matrix[ri][ci];
                const strength = n / max;
                const hint = HINTS[`${r}${c}`];
                return (
                  <td
                    key={c}
                    title={`${fill(t.cell, { n, r, c })}${hint ? `. ${hint}` : ""}`}
                    className="h-14 rounded text-center tabular-nums"
                    // Capped at 55% so the regular text color stays legible in both themes.
                    style={{
                      background: `color-mix(in oklab, var(--abc-b) ${Math.round(6 + strength * 49)}%, var(--card))`,
                    }}
                  >
                    <span className="block font-semibold">{n}</span>
                    <span className="block text-[11px] opacity-75">
                      {total > 0 ? `${Math.round((n / total) * 100)}%` : "–"}
                    </span>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
      <ul className="mt-3 space-y-1 text-xs text-muted-foreground">
        {Object.entries(HINTS).map(([k, v]) => (
          <li key={k}>
            <span className="font-mono font-medium text-foreground">
              {k[0]}/{k[1]}
            </span>{" "}
            {v}
          </li>
        ))}
      </ul>
    </div>
  );
}
