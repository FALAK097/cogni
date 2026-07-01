"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useLayoutEffect, useState } from "react";

import { Menu } from "@/components/app-nav/menu";
import { WorkspaceSwitcher } from "@/components/app-nav/workspace-switcher";
import { ThemeLogo } from "@/components/theme-logo";
import { closeMobileSidebar, useSidebar } from "@/hooks/use-sidebar";
import { SITE_NAME } from "@/lib/constants";
import { cn } from "@/lib/utils";

export function Sidebar({ initialOpen = true }: { initialOpen?: boolean }) {
  const pathname = usePathname();
  const isOpen = useSidebar((state) => state.isOpen);
  const mobileDrawerOpen = useSidebar((state) => state.mobileDrawerOpen);
  const isHover = useSidebar((state) => state.isHover);
  const hasHydrated = useSidebar((state) => state.hasHydrated);
  const setIsHover = useSidebar((state) => state.setIsHover);
  const settings = useSidebar((state) => state.settings);
  const [transitionsEnabled, setTransitionsEnabled] = useState(false);

  const desktopOpen = (hasHydrated ? isOpen : initialOpen) || (settings.isHoverOpen && isHover);
  const sidebarExpanded = mobileDrawerOpen || desktopOpen;

  useLayoutEffect(() => {
    closeMobileSidebar();
  }, []);

  useEffect(() => {
    closeMobileSidebar();
  }, [pathname]);

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      setTransitionsEnabled(true);
    });
    return () => cancelAnimationFrame(frame);
  }, []);

  const appName = SITE_NAME;

  return (
    <>
      <button
        type="button"
        aria-label="Close navigation"
        aria-hidden={!mobileDrawerOpen}
        tabIndex={mobileDrawerOpen ? 0 : -1}
        className={cn(
          "fixed inset-0 z-30 bg-black/50 supports-backdrop-filter:backdrop-blur-sm lg:hidden",
          transitionsEnabled && "transition-opacity duration-300",
          mobileDrawerOpen ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0",
        )}
        onClick={() => closeMobileSidebar()}
      />
      <aside
        className={cn(
          "fixed top-0 left-0 z-40 h-screen bg-sidebar print:hidden",
          "max-lg:w-56 max-lg:-translate-x-full",
          mobileDrawerOpen && "max-lg:translate-x-0",
          "lg:translate-x-0",
          desktopOpen ? "lg:w-56" : "lg:w-[90px]",
          transitionsEnabled && "transition-[transform,width] ease-in-out duration-300",
          settings.disabled && "hidden",
        )}
      >
        <div
          onMouseEnter={() => setIsHover(true)}
          onMouseLeave={() => setIsHover(false)}
          className="flex h-full flex-col items-stretch border-r border-sidebar-border"
        >
          {/* Header section */}
          <div className="flex-none px-4 pt-4 pb-2">
            <div className="flex items-center justify-between">
              <Link
                href="/dashboard"
                onClick={() => closeMobileSidebar()}
                className={cn(
                  "flex items-center gap-2.5",
                  sidebarExpanded ? "px-2.5" : "w-full justify-center",
                )}
              >
                <ThemeLogo
                  className={cn("flex-shrink-0", sidebarExpanded ? "w-6 h-6" : "w-8 h-8")}
                />
                <h1
                  className={cn(
                    "whitespace-nowrap text-lg font-bold",
                    transitionsEnabled &&
                      "transition-[transform,opacity,display] ease-in-out duration-300",
                    !sidebarExpanded
                      ? "-translate-x-96 hidden opacity-0"
                      : "translate-x-0 opacity-100",
                  )}
                >
                  <span className="text-base font-bold transition-all sm:text-lg">{appName}</span>
                </h1>
              </Link>
            </div>
          </div>

          {/* Workspace Switcher */}
          <div className="flex-none px-3 pb-1">
            <WorkspaceSwitcher isOpen={sidebarExpanded} />
          </div>

          <div
            className="scrollbar-hide w-full flex-1 overflow-y-auto"
            style={{
              msOverflowStyle: "none",
              scrollbarWidth: "none",
            }}
          >
            <style>{`
						/* Webkit browsers like Chrome/Safari */
						.scrollbar-hide::-webkit-scrollbar {
							display: none;
						}
					`}</style>
            <Menu isOpen={sidebarExpanded} />
          </div>

          <div className="h-3 flex-none" />
        </div>
      </aside>
    </>
  );
}
