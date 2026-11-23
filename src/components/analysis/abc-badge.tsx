import type { AbcClass } from "@/lib/analysis/abc";
import { ABC_FILL, ABC_INK } from "./abc-colors";

export function AbcBadge({ cls }: { cls: AbcClass }) {
  return (
    <span
      className="inline-grid size-5 place-items-center rounded text-[11px] font-semibold"
      style={{ background: ABC_FILL[cls], color: ABC_INK[cls] }}
      aria-label={`Class ${cls}`}
    >
      {cls}
    </span>
  );
}
