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
import { fill, useI18n } from "@/i18n/client";
import { Logo } from "./logo";
import { MODULE_NAV, WORKSPACE_NAV, type NavItem } from "./nav";

function NavMenu({ items, pathname }: { items: NavItem[]; pathname: string | null }) {
  const { t, href } = useI18n();
  return (
    <SidebarMenu>
      {items.map((item) => {
        const title = t.nav[item.key];
        const target = href(item.href);
        return (
          <SidebarMenuItem key={item.href}>
            {item.soon ? (
              <SidebarMenuButton disabled tooltip={fill(t.common.comingSoon, { title })} aria-disabled>
                <item.icon />
                <span>{title}</span>
              </SidebarMenuButton>
            ) : (
              <SidebarMenuButton
                asChild
                tooltip={title}
                isActive={!!pathname && (pathname === target || pathname.startsWith(`${target}/`))}
              >
                <Link href={target}>
                  <item.icon />
                  <span>{title}</span>
                </Link>
              </SidebarMenuButton>
            )}
            {item.soon && <SidebarMenuBadge className="text-[10px] uppercase">{t.common.soon}</SidebarMenuBadge>}
          </SidebarMenuItem>
        );
      })}
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
  const { t } = useI18n();
  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="h-14 justify-center px-4 group-data-[collapsible=icon]:px-2">
        <Logo to="/dashboard" className="[&>span]:group-data-[collapsible=icon]:hidden" />
      </SidebarHeader>
      <SidebarContent>
        <NavGroup label={t.nav.workspace} items={WORKSPACE_NAV} />
        <NavGroup label={t.nav.modules} items={MODULE_NAV} />
      </SidebarContent>
      <SidebarFooter>{footer}</SidebarFooter>
      <SidebarRail label={t.a11y.toggleSidebar} />
    </Sidebar>
  );
}
