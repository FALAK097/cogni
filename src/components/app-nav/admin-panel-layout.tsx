"use client";

import type { ReactNode } from "react";

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
  const getOpenState = useSidebar((state) => state.getOpenState);
  const settings = useSidebar((state) => state.settings);

  return (
    <>
      <Sidebar />
      <main
        className={cn(
          "min-h-screen bg-zinc-50 dark:bg-zinc-900 transition-[margin-left] ease-in-out duration-300",
          !settings.disabled && (!getOpenState() ? "lg:ml-[90px]" : "lg:ml-56"),
          "print:ml-0 print:w-full print:overflow-visible",
        )}
      >
        <AppTopbar userData={userData} />
        <div>{children}</div>
      </main>
    </>
  );
}
