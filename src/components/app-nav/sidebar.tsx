"use client";
import Link from "next/link";
import { useEffect } from "react";

import { Menu } from "@/components/app-nav/menu";
import { WorkspaceSwitcher } from "@/components/app-nav/workspace-switcher";
import { ThemeLogo } from "@/components/theme-logo";
import { useSidebar } from "@/hooks/use-sidebar";
import { SITE_NAME } from "@/lib/constants";
import { cn } from "@/lib/utils";

export function Sidebar() {
  const isOpen = useSidebar((state) => state.isOpen);
  const isHover = useSidebar((state) => state.isHover);
  const toggleOpen = useSidebar((state) => state.toggleOpen);
  const setIsHover = useSidebar((state) => state.setIsHover);
  const settings = useSidebar((state) => state.settings);

  const openState = isOpen || (settings.isHoverOpen && isHover);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 1024 && openState) {
        toggleOpen(false);
      }
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [openState, toggleOpen]);
  const appName = SITE_NAME;

  return (
    <>
      <button
        type="button"
        aria-label="Close navigation"
        className="fixed inset-0 z-30 bg-black/80 lg:hidden"
        onClick={() => toggleOpen(false)}
        style={{
          opacity: openState ? 1 : 0,
          pointerEvents: openState ? "auto" : "none",
        }}
      />
      <aside
        className={cn(
          "fixed top-0 bg-card left-0 z-40 h-screen transition-[transform,width] ease-in-out duration-300 print:hidden",
          !openState ? "w-[90px] translate-x-[-90px] lg:translate-x-0" : "w-56 translate-x-0",
          settings.disabled && "hidden",
        )}
      >
        <div
          onMouseEnter={() => setIsHover(true)}
          onMouseLeave={() => setIsHover(false)}
          className="flex flex-col h-full border-r border-border items-stretch"
        >
          {/* Header section */}
          <div className="flex-none px-4 pt-4 pb-2">
            <div className="flex items-center justify-between">
              <Link
                href="/dashboard"
                className={cn(
                  "flex items-center gap-2.5",
                  openState ? "px-2.5" : "w-full justify-center",
                )}
              >
                <ThemeLogo className={cn("flex-shrink-0", openState ? "w-6 h-6" : "w-8 h-8")} />
                <h1
                  className={cn(
                    "font-bold text-lg whitespace-nowrap transition-[transform,opacity,display] ease-in-out duration-300",
                    !openState ? "-translate-x-96 opacity-0 hidden" : "translate-x-0 opacity-100",
                  )}
                >
                  <span className="text-base font-bold transition-all sm:text-lg">{appName}</span>
                </h1>
              </Link>
            </div>
          </div>

          {/* Workspace Switcher */}
          <div className="flex-none px-3 pb-1">
            <WorkspaceSwitcher isOpen={openState} />
          </div>

          <div
            className="w-full flex-1 overflow-y-auto scrollbar-hide"
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
            <Menu isOpen={openState} />
          </div>

          <div className="flex-none h-3" />
        </div>
      </aside>
    </>
  );
}
