import {
  Boxes,
  ChartColumnBig,
  FolderKanban,
  Gauge,
  LayoutDashboard,
  Route,
  Workflow,
  type LucideIcon,
} from "lucide-react";

export type NavItem = {
  title: string;
  href: string;
  icon: LucideIcon;
  /** Planned module; shown in the sidebar but not clickable yet. */
  soon?: boolean;
};

export const WORKSPACE_NAV: NavItem[] = [
  { title: "Overview", href: "/dashboard", icon: LayoutDashboard },
  { title: "Projects", href: "/projects", icon: FolderKanban },
];

export const MODULE_NAV: NavItem[] = [
  { title: "Movement analysis", href: "/analysis", icon: ChartColumnBig },
  { title: "Layout studio", href: "/studio", icon: Boxes, soon: true },
  { title: "Slotting", href: "/slotting", icon: Route, soon: true },
  { title: "Productivity", href: "/productivity", icon: Gauge, soon: true },
  { title: "Process maps", href: "/process", icon: Workflow, soon: true },
];
