"use client";

import type { ReactNode } from "react";
import { useLayoutEffect } from "react";
import { usePathname } from "next/navigation";

import { AppTopbar } from "@/components/app-nav/app-topbar";
import { Sidebar } from "@/components/app-nav/sidebar";
import { useSidebar } from "@/hooks/use-sidebar";
import { cn } from "@/lib/utils";

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
  const isOpen = useSidebar((state) => state.isOpen);
  const isHover = useSidebar((state) => state.isHover);
  const settings = useSidebar((state) => state.settings);
  const hasHydrated = useSidebar((state) => state._hasHydrated);
  const setHasHydrated = useSidebar((state) => state.setHasHydrated);

  useLayoutEffect(() => {
    useSidebar.setState({ isOpen: initialSidebarOpen });
    setHasHydrated(true);
  }, [initialSidebarOpen, setHasHydrated]);

  const openState =
    (hasHydrated ? isOpen : initialSidebarOpen) || (settings.isHoverOpen && isHover);
  const pathname = usePathname();
  const isWidgetPage = pathname === "/widget";

  return (
    <>
      <Sidebar initialOpen={initialSidebarOpen} />
      <main
        className={cn(
          "bg-background transition-[margin-left] ease-in-out duration-300",
          !settings.disabled && (!openState ? "lg:ml-[90px]" : "lg:ml-56"),
          "print:ml-0 print:w-full print:overflow-visible",
          isWidgetPage ? "flex h-svh flex-col overflow-hidden" : "min-h-screen",
        )}
      >
        {!isWidgetPage ? <AppTopbar userData={userData} /> : null}
        <div className={cn(isWidgetPage && "flex min-h-0 flex-1 flex-col overflow-hidden")}>
          {children}
        </div>
      </main>
    </>
  );
}
