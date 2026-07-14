"use client";

import Link from "next/link";
import { useEffect } from "react";

import { Menu } from "@/components/app-nav/menu";
import { WorkspaceSwitcher } from "@/components/app-nav/workspace-switcher";
import { ArrowUpRight } from "@/components/icons";
import { ThemeLogo } from "@/components/theme-logo";
import { SITE_NAME } from "@/lib/constants";
import { useSidebar } from "@/hooks/use-sidebar";
import { cn } from "@/lib/utils";

export function WorkspaceSidebar({ initialOpen = true }: { initialOpen?: boolean }) {
  const isOpen = useSidebar((state) => state.isOpen);
  const isHover = useSidebar((state) => state.isHover);
  const hasHydrated = useSidebar((state) => state.hasHydrated);
  const toggleOpen = useSidebar((state) => state.toggleOpen);
  const closeOnMobile = useSidebar((state) => state.closeOnMobile);
  const setIsHover = useSidebar((state) => state.setIsHover);
  const settings = useSidebar((state) => state.settings);

  const openState = (hasHydrated ? isOpen : initialOpen) || (settings.isHoverOpen && isHover);
  const canAnimate = hasHydrated;

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 1024 && openState) {
        toggleOpen(false);
      }
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [openState, toggleOpen]);

  return (
    <>
      <button
        type="button"
        aria-label="Close navigation"
        className="fixed inset-0 z-30 bg-foreground/80 lg:hidden"
        onClick={() => toggleOpen(false)}
        style={{
          opacity: openState ? 1 : 0,
          pointerEvents: openState ? "auto" : "none",
        }}
      />
      <aside
        className={cn(
          "z-40 flex h-svh shrink-0 flex-col border-r border-sidebar-border bg-sidebar print:hidden",
          "lg:relative",
          "fixed inset-y-0 left-0 lg:static",
          canAnimate && "transition-[width,transform] ease-in-out duration-300",
          !openState ? "w-[72px] -translate-x-full lg:translate-x-0" : "w-60 translate-x-0",
          settings.disabled && "hidden",
        )}
      >
        <div
          className={cn("shrink-0 overflow-visible pt-4", openState ? "px-4" : "px-2")}
          onMouseEnter={() => setIsHover(true)}
          onMouseLeave={() => setIsHover(false)}
        >
          <Link
            href="/agents"
            onClick={closeOnMobile}
            className={cn("flex items-center gap-2.5", !openState && "justify-center")}
          >
            <ThemeLogo className="size-7 shrink-0 rounded-full" />
            {openState ? (
              <span className="truncate text-base font-bold tracking-tight text-foreground">
                {SITE_NAME}
              </span>
            ) : null}
          </Link>

          <div className={cn("mt-4 overflow-visible", !openState && "mt-3")}>
            <WorkspaceSwitcher isOpen={openState} />
          </div>
        </div>

        <div
          className="flex min-h-0 flex-1 flex-col overflow-y-auto scrollbar-hide"
          onMouseEnter={() => setIsHover(true)}
          onMouseLeave={() => setIsHover(false)}
          style={{ msOverflowStyle: "none", scrollbarWidth: "none" }}
        >
          <style>{`.scrollbar-hide::-webkit-scrollbar { display: none; }`}</style>
          <Menu isOpen={openState} variant="workspace" />
        </div>

        {openState ? (
          <div className="shrink-0 border-t border-sidebar-border p-3">
            <div className="rounded-xl border border-border bg-card p-3 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-foreground">Credits</span>
                <span className="text-sm text-muted-foreground">0 / 50</span>
              </div>
              <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
                Resets monthly on your billing date.
              </p>
              <button
                type="button"
                className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-lg border border-border bg-background px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted"
              >
                Upgrade
                <ArrowUpRight className="size-3.5" />
              </button>
            </div>
          </div>
        ) : null}
      </aside>
    </>
  );
}
