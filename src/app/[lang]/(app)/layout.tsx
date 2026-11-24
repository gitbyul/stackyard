import { Suspense } from "react";

import { AppSidebar } from "@/components/app/app-sidebar";
import { UserMenu, UserMenuSkeleton } from "@/components/app/user-menu";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider>
      <AppSidebar
        footer={
          <Suspense fallback={<UserMenuSkeleton />}>
            <UserMenu />
          </Suspense>
        }
      />
      <SidebarInset>{children}</SidebarInset>
    </SidebarProvider>
  );
}
