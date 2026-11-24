"use client";

import { Handle, Position, type Node, type NodeProps } from "@xyflow/react";
import { AlertTriangle } from "lucide-react";
import { memo } from "react";

import type { Step, StepKind } from "@/lib/process-map/model";
import { useI18n } from "@/i18n/client";
import { formatMinutes } from "@/lib/process-map/format";
import { cn } from "@/lib/utils";

export type StepData = Omit<Step, "id" | "x" | "y"> & {
  critical?: boolean;
  flagged?: boolean;
};
export type StepNodeType = Node<StepData, "step">;

/** Flow-process-chart (ASME) symbols, drawn in the current text colour. */
export function StepSymbol({ kind, className }: { kind: StepKind; className?: string }) {
  const common = { fill: "none", stroke: "currentColor", strokeWidth: 1.75 };
  return (
    <svg viewBox="0 0 20 20" className={cn("size-5 shrink-0", className)} aria-hidden>
      {kind === "operation" && <circle cx="10" cy="10" r="7" {...common} />}
      {kind === "inspection" && <rect x="3.5" y="3.5" width="13" height="13" {...common} />}
      {kind === "transport" && <path d="M3 10h11M10 5l5 5-5 5" {...common} strokeLinecap="round" strokeLinejoin="round" />}
      {kind === "delay" && <path d="M4 4h6a6 6 0 0 1 0 12H4z" {...common} />}
      {kind === "storage" && <path d="M10 3.5 17 16.5H3z" {...common} strokeLinejoin="round" />}
      {kind === "decision" && <path d="M10 2.5 17.5 10 10 17.5 2.5 10z" {...common} strokeLinejoin="round" />}
    </svg>
  );
}

function StepNodeView({ data, selected }: NodeProps<StepNodeType>) {
  const { t: dict } = useI18n();
  const t = dict.process;
  return (
    <div
      className={cn(
        "w-48 rounded-lg border bg-card px-3 py-2 text-card-foreground shadow-sm transition-shadow",
        data.critical && "border-signal ring-2 ring-signal/40",
        data.flagged && "border-destructive",
        selected && "ring-2 ring-primary",
      )}
    >
      <Handle type="target" position={Position.Left} className="!size-2.5 !border-2 !border-card !bg-muted-foreground" />
      <div className="flex items-start gap-2">
        <StepSymbol kind={data.kind} className={data.valueAdded ? "text-primary dark:text-signal" : "text-muted-foreground"} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium leading-tight" title={data.label}>
            {data.label}
          </p>
          <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
            {formatMinutes(t, data.minutes)}
            {data.process && ` · ${dict.processes[data.process].label}`}
            {data.role && ` · ${data.role}`}
          </p>
        </div>
        {data.flagged && <AlertTriangle className="size-3.5 shrink-0 text-destructive" aria-label={t.hasIssues} />}
      </div>
      <span
        className={cn(
          "mt-1.5 inline-block rounded px-1.5 py-px text-[10px] font-medium uppercase tracking-wide",
          data.valueAdded ? "bg-primary/10 text-primary dark:bg-signal/15 dark:text-signal" : "bg-muted text-muted-foreground",
        )}
      >
        {data.valueAdded ? t.valueAdded : t.nonValueAdded}
      </span>
      <Handle type="source" position={Position.Right} className="!size-2.5 !border-2 !border-card !bg-muted-foreground" />
    </div>
  );
}

export const StepNode = memo(StepNodeView);
