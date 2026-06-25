"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";

import { AppTopbar } from "@/components/app-nav/app-topbar";
import { Sidebar } from "@/components/app-nav/sidebar";
import { useSidebar } from "@/hooks/use-sidebar";
import { cn } from "@/lib/utils";

type AdminPanelLayoutProps = {
  children: ReactNode;
  userData?: {
    avatar?: string;
    name?: string;
    email?: string;
  };
};

export default function AdminPanelLayout({ children, userData }: AdminPanelLayoutProps) {
  const pathname = usePathname();
  const isOpen = useSidebar((state) => state.isOpen);
  const isHover = useSidebar((state) => state.isHover);
  const hasHydrated = useSidebar((state) => state.hasHydrated);
  const settings = useSidebar((state) => state.settings);

  const openState = isOpen || (settings.isHoverOpen && isHover);
  const canAnimate = hasHydrated;
  const hideTopbar = pathname === "/conversations" || pathname.startsWith("/conversations/");

  return (
    <>
      <Sidebar />
      <main
        className={cn(
          "min-h-screen bg-zinc-50 dark:bg-zinc-900",
          canAnimate && "transition-[margin-left] ease-in-out duration-300",
          !settings.disabled && (!openState ? "lg:ml-[90px]" : "lg:ml-56"),
          "print:ml-0 print:w-full print:overflow-visible",
        )}
      >
        {!hideTopbar ? <AppTopbar userData={userData} /> : null}
        <div>{children}</div>
      </main>
    </>
  );
}
