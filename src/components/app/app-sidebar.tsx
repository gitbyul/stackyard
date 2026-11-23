"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Suspense } from "react";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar";
import { Logo } from "./logo";
import { MODULE_NAV, WORKSPACE_NAV, type NavItem } from "./nav";

function NavMenu({ items, pathname }: { items: NavItem[]; pathname: string | null }) {
  return (
    <SidebarMenu>
      {items.map((item) => (
        <SidebarMenuItem key={item.href}>
          {item.soon ? (
            <SidebarMenuButton disabled tooltip={`${item.title} (coming soon)`} aria-disabled>
              <item.icon />
              <span>{item.title}</span>
            </SidebarMenuButton>
          ) : (
            <SidebarMenuButton
              asChild
              tooltip={item.title}
              isActive={!!pathname && (pathname === item.href || pathname.startsWith(`${item.href}/`))}
            >
              <Link href={item.href}>
                <item.icon />
                <span>{item.title}</span>
              </Link>
            </SidebarMenuButton>
          )}
          {item.soon && <SidebarMenuBadge className="text-[10px] uppercase">Soon</SidebarMenuBadge>}
        </SidebarMenuItem>
      ))}
    </SidebarMenu>
  );
}

function ActiveNavMenu({ items }: { items: NavItem[] }) {
  return <NavMenu items={items} pathname={usePathname()} />;
}

function NavGroup({ label, items }: { label: string; items: NavItem[] }) {
  return (
    <SidebarGroup>
      <SidebarGroupLabel>{label}</SidebarGroupLabel>
      <SidebarGroupContent>
        {/* usePathname() is request data on dynamic routes; prerender the menu without a highlight. */}
        <Suspense fallback={<NavMenu items={items} pathname={null} />}>
          <ActiveNavMenu items={items} />
        </Suspense>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}

export function AppSidebar({ footer }: { footer: React.ReactNode }) {
  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="h-14 justify-center px-4 group-data-[collapsible=icon]:px-2">
        <Logo href="/dashboard" className="[&>span]:group-data-[collapsible=icon]:hidden" />
      </SidebarHeader>
      <SidebarContent>
        <NavGroup label="Workspace" items={WORKSPACE_NAV} />
        <NavGroup label="Modules" items={MODULE_NAV} />
      </SidebarContent>
      <SidebarFooter>{footer}</SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
