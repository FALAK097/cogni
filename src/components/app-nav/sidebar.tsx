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
  const toggleOpen = useSidebar((state) => state.toggleOpen);
  const closeOnMobile = useSidebar((state) => state.closeOnMobile);
  const setIsHover = useSidebar((state) => state.setIsHover);
  const settings = useSidebar((state) => state.settings);
  const [transitionsEnabled, setTransitionsEnabled] = useState(false);

  const desktopOpen = (hasHydrated ? isOpen : initialOpen) || (settings.isHoverOpen && isHover);
  const openState = mobileDrawerOpen || desktopOpen;
  const canAnimate = hasHydrated && transitionsEnabled;

  useLayoutEffect(() => {
    closeMobileSidebar();
  }, []);

  useEffect(() => {
    closeMobileSidebar();
    closeOnMobile();
  }, [pathname, closeOnMobile]);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 1024 && mobileDrawerOpen) {
        toggleOpen(false);
      }
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [mobileDrawerOpen, toggleOpen]);

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      setTransitionsEnabled(true);
    });
    return () => cancelAnimationFrame(frame);
  }, []);

  return (
    <>
      <button
        type="button"
        aria-label="Close navigation"
        aria-hidden={!mobileDrawerOpen}
        tabIndex={mobileDrawerOpen ? 0 : -1}
        className={cn(
          "fixed inset-0 z-30 bg-black/50 supports-backdrop-filter:backdrop-blur-sm lg:hidden",
          canAnimate && "transition-opacity duration-300",
          mobileDrawerOpen ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0",
        )}
        onClick={() => closeMobileSidebar()}
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
            href="/backstage"
            onClick={() => {
              closeOnMobile();
              closeMobileSidebar();
            }}
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
          <Menu isOpen={openState} />
        </div>
      </aside>
    </>
  );
}
