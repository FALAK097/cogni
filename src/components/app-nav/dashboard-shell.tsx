"use client";

import type { ReactNode } from "react";
import { useLayoutEffect } from "react";
import { usePathname } from "next/navigation";

import { AppTopbar } from "@/components/app-nav/app-topbar";
import { AgentNavigation } from "@/components/app-nav/agent-navigation";
import { Sidebar } from "@/components/app-nav/sidebar";
import { useSidebar } from "@/hooks/use-sidebar";
import { cn } from "@/lib/utils";

type UserData = {
  avatar?: string;
  name?: string;
  email?: string;
};

type DashboardShellProps = {
  children: ReactNode;
  initialSidebarOpen?: boolean;
  userData?: UserData;
};

export function DashboardShell({
  children,
  userData,
  initialSidebarOpen = true,
}: DashboardShellProps) {
  const isOpen = useSidebar((state) => state.isOpen);
  const isHover = useSidebar((state) => state.isHover);
  const hasHydrated = useSidebar((state) => state.hasHydrated);
  const settings = useSidebar((state) => state.settings);
  const setHasHydrated = useSidebar((state) => state.setHasHydrated);

  useLayoutEffect(() => {
    useSidebar.setState({ isOpen: initialSidebarOpen, mobileDrawerOpen: false });
    setHasHydrated(true);
  }, [initialSidebarOpen, setHasHydrated]);

  const desktopOpenState =
    (hasHydrated ? isOpen : initialSidebarOpen) || (settings.isHoverOpen && isHover);
  const pathname = usePathname();
  const isFullBleedPage = pathname === "/playground" || pathname === "/conversations";

  return (
    <>
      <a
        href="#workspace-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[60] focus:rounded-md focus:bg-background focus:px-4 focus:py-2 focus:text-foreground focus:outline-2 focus:outline-offset-2 focus:outline-ring"
      >
        Skip to content
      </a>
      <Sidebar initialOpen={initialSidebarOpen} />
      <main
        className={cn(
          "bg-sidebar text-foreground transition-[margin-left] duration-150 motion-reduce:transition-none",
          !settings.disabled && (!desktopOpenState ? "lg:ml-14" : "lg:ml-56"),
          "print:ml-0 print:w-full print:overflow-visible",
          isFullBleedPage ? "flex h-svh flex-col overflow-hidden" : "min-h-screen",
        )}
      >
        <AppTopbar userData={userData} className={cn(isFullBleedPage && "lg:hidden")} />
        {(pathname === "/playground" || pathname === "/knowledge-base") && <AgentNavigation />}
        <div
          id="workspace-content"
          tabIndex={-1}
          className={cn(
            "outline-none",
            isFullBleedPage && "flex min-h-0 flex-1 flex-col overflow-hidden",
          )}
        >
          {children}
        </div>
      </main>
    </>
  );
}
