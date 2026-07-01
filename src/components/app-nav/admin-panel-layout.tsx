"use client";

import type { ReactNode } from "react";
import { useLayoutEffect } from "react";
import { usePathname } from "next/navigation";

import { AppTopbar } from "@/components/app-nav/app-topbar";
import { Sidebar } from "@/components/app-nav/sidebar";
import { useSidebar } from "@/hooks/use-sidebar";
import { cn } from "@/lib/utils";

type UserData = {
  avatar?: string;
  name?: string;
  email?: string;
};

type AdminPanelLayoutProps = {
  children: ReactNode;
  initialSidebarOpen?: boolean;
  userData?: UserData;
};

export default function AdminPanelLayout({
  children,
  userData,
  initialSidebarOpen = true,
}: AdminPanelLayoutProps) {
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
  const isFullBleedPage = pathname === "/widget" || pathname === "/conversations";

  return (
    <>
      <Sidebar initialOpen={initialSidebarOpen} />
      <main
        className={cn(
          "bg-sidebar text-foreground transition-[margin-left] ease-in-out duration-300",
          !settings.disabled && (!desktopOpenState ? "lg:ml-[90px]" : "lg:ml-56"),
          "print:ml-0 print:w-full print:overflow-visible",
          isFullBleedPage ? "flex h-svh flex-col overflow-hidden" : "min-h-screen",
        )}
      >
        <AppTopbar userData={userData} className={cn(isFullBleedPage && "lg:hidden")} />
        <div className={cn(isFullBleedPage && "flex min-h-0 flex-1 flex-col overflow-hidden")}>
          {children}
        </div>
      </main>
    </>
  );
}
