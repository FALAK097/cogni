"use client";

import type { ReactNode } from "react";
import { useEffect, useLayoutEffect } from "react";
import { usePathname } from "next/navigation";

import { AppShellNavbar } from "@/components/app-nav/app-shell-navbar";
import { CreateWorkspaceDialog } from "@/components/app-nav/create-workspace-dialog";
import { Sidebar } from "@/components/app-nav/sidebar";
import { WorkspaceSidebar } from "@/components/app-nav/workspace-sidebar";
import { useSidebar } from "@/hooks/use-sidebar";
import { isWorkspaceRoute } from "@/lib/workspace-routing";

type AdminPanelLayoutProps = {
  children: ReactNode;
  initialSidebarOpen?: boolean;
  userData?: {
    avatar?: string;
    name?: string;
    email?: string;
  };
};

export default function AdminPanelLayout({
  children,
  userData,
  initialSidebarOpen = true,
}: AdminPanelLayoutProps) {
  const setHasHydrated = useSidebar((state) => state.setHasHydrated);
  const closeOnMobile = useSidebar((state) => state.closeOnMobile);
  const pathname = usePathname();
  const workspaceView = isWorkspaceRoute(pathname);

  useLayoutEffect(() => {
    useSidebar.setState({ isOpen: initialSidebarOpen });
    setHasHydrated(true);
  }, [initialSidebarOpen, setHasHydrated]);

  useEffect(() => {
    closeOnMobile();
  }, [pathname, closeOnMobile]);

  return (
    <div className="flex h-svh overflow-hidden bg-background print:h-auto print:overflow-visible">
      {workspaceView ? (
        <WorkspaceSidebar initialOpen={initialSidebarOpen} />
      ) : (
        <Sidebar initialOpen={initialSidebarOpen} />
      )}

      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        <AppShellNavbar userData={userData} />

        <main className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-background">
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden">{children}</div>
        </main>
      </div>

      <CreateWorkspaceDialog />
    </div>
  );
}
