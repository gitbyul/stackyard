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

import type { Dictionary } from "@/i18n/dictionaries";

export type NavItem = {
  /** Key into the `nav` dictionary section. */
  key: Exclude<keyof Dictionary["nav"], "workspace" | "modules">;
  /** App path without the locale prefix. */
  href: string;
  icon: LucideIcon;
  /** Planned module; shown in the sidebar but not clickable yet. */
  soon?: boolean;
};

export const WORKSPACE_NAV: NavItem[] = [
  { key: "overview", href: "/dashboard", icon: LayoutDashboard },
  { key: "projects", href: "/projects", icon: FolderKanban },
];

export const MODULE_NAV: NavItem[] = [
  { key: "analysis", href: "/analysis", icon: ChartColumnBig },
  { key: "studio", href: "/studio", icon: Boxes },
  { key: "slotting", href: "/slotting", icon: Route },
  { key: "productivity", href: "/productivity", icon: Gauge },
  { key: "process", href: "/process", icon: Workflow },
];
