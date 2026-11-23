import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";

import type { Status } from "@/lib/productivity/metrics";

/** Status is never colour alone: each state has its own icon and label. */
const STATUS = {
  above: { label: "Above", Icon: ArrowUpRight, color: "var(--status-good)" },
  par: { label: "On par", Icon: Minus, color: "var(--status-warning)" },
  below: { label: "Below", Icon: ArrowDownRight, color: "var(--status-critical)" },
} as const;

export function StatusBadge({ status }: { status: Status }) {
  const { label, Icon, color } = STATUS[status];
  return (
    <span className="inline-flex items-center gap-1 text-xs font-medium text-foreground">
      <Icon className="size-3.5" style={{ color }} aria-hidden />
      {label}
    </span>
  );
}
