"use client";

import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";

import { useI18n } from "@/i18n/client";
import type { Status } from "@/lib/productivity/metrics";

/** Status is never colour alone: each state has its own icon and label. */
const STATUS = {
  above: { Icon: ArrowUpRight, color: "var(--status-good)" },
  par: { Icon: Minus, color: "var(--status-warning)" },
  below: { Icon: ArrowDownRight, color: "var(--status-critical)" },
} as const;

export function StatusBadge({ status }: { status: Status }) {
  const { Icon, color } = STATUS[status];
  const label = useI18n().t.productivity.status[status];
  return (
    <span className="inline-flex items-center gap-1 text-xs font-medium text-foreground">
      <Icon className="size-3.5" style={{ color }} aria-hidden />
      {label}
    </span>
  );
}
