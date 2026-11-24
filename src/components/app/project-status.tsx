"use client";

import { Badge } from "@/components/ui/badge";
import { useI18n } from "@/i18n/client";
import type { ProjectStatus } from "@/lib/data/projects";
import { cn } from "@/lib/utils";

const STYLES: Record<ProjectStatus, string> = {
  discovery: "bg-chart-3/15 text-chart-3",
  analysis: "bg-chart-2/15 text-chart-2",
  design: "bg-signal/20 text-signal-foreground dark:text-signal",
  delivered: "bg-chart-4/15 text-chart-4",
};

export function ProjectStatusBadge({ status }: { status: ProjectStatus }) {
  const { t } = useI18n();
  return (
    <Badge variant="secondary" className={cn("border-transparent font-medium", STYLES[status])}>
      {t.status[status]}
    </Badge>
  );
}
