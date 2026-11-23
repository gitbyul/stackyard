import { Badge } from "@/components/ui/badge";
import type { ProjectStatus } from "@/lib/data/projects";
import { cn } from "@/lib/utils";

const STYLES: Record<ProjectStatus, { label: string; className: string }> = {
  discovery: { label: "Discovery", className: "bg-chart-3/15 text-chart-3" },
  analysis: { label: "Analysis", className: "bg-chart-2/15 text-chart-2" },
  design: { label: "Design", className: "bg-signal/20 text-signal-foreground dark:text-signal" },
  delivered: { label: "Delivered", className: "bg-chart-4/15 text-chart-4" },
};

export function ProjectStatusBadge({ status }: { status: ProjectStatus }) {
  const s = STYLES[status];
  return (
    <Badge variant="secondary" className={cn("border-transparent font-medium", s.className)}>
      {s.label}
    </Badge>
  );
}
