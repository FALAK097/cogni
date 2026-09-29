"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect } from "react";

import { Menu } from "@/components/app-nav/menu";
import { WorkspaceSwitcher } from "@/components/app-nav/workspace-switcher";
import { ThemeLogo } from "@/components/theme-logo";
import { Settings } from "@/components/icons";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { closeMobileSidebar, useIsMobileSidebar, useSidebar } from "@/hooks/use-sidebar";
import { SITE_NAME } from "@/lib/constants";
import { cn } from "@/lib/utils";

function SidebarContent({ expanded }: { expanded: boolean }) {
  const pathname = usePathname();

  return (
    <div className="flex h-full min-h-0 flex-col items-stretch">
      <div className="flex-none px-4 pt-4 pb-2">
        <Link
          href="/dashboard"
          aria-label={`${SITE_NAME} home`}
          onClick={closeMobileSidebar}
          className={cn(
            "flex items-center gap-2.5 rounded-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
            expanded ? "w-fit px-2.5" : "w-full justify-center",
          )}
        >
          <ThemeLogo className={cn("shrink-0", expanded ? "size-6" : "size-8")} />
          {expanded && <span className="whitespace-nowrap text-lg font-bold">{SITE_NAME}</span>}
        </Link>
      </div>
      <div className="flex-none px-3 pb-1">
        <WorkspaceSwitcher isOpen={expanded} />
      </div>
      <div className="w-full min-h-0 flex-1 overflow-y-auto overscroll-contain">
        <Menu isOpen={expanded} />
      </div>
      <div className="flex-none border-t border-sidebar-border p-3">
        <Link
          href="/integrations"
          onClick={closeMobileSidebar}
          aria-label="Settings: connections"
          aria-current={pathname.startsWith("/integrations") ? "page" : false}
          title={expanded ? "Workspace connections" : "Settings"}
          className={cn(
            "flex min-h-10 items-center gap-4 rounded-md px-4 text-sm transition-colors duration-150 hover:bg-sidebar-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
            !expanded && "justify-center px-0",
            pathname.startsWith("/integrations") && "bg-sidebar-accent font-medium",
          )}
        >
          <Settings className="size-[18px] shrink-0" />
          {expanded && <span>Settings</span>}
        </Link>
      </div>
    </div>
  );
}

export function Sidebar({ initialOpen = true }: { initialOpen?: boolean }) {
  const pathname = usePathname();
  const isMobile = useIsMobileSidebar();
  const isOpen = useSidebar((state) => state.isOpen);
  const mobileDrawerOpen = useSidebar((state) => state.mobileDrawerOpen);
  const setMobileDrawerOpen = useSidebar((state) => state.setMobileDrawerOpen);
  const isHover = useSidebar((state) => state.isHover);
  const hasHydrated = useSidebar((state) => state.hasHydrated);
  const setIsHover = useSidebar((state) => state.setIsHover);
  const settings = useSidebar((state) => state.settings);
  const desktopOpen = (hasHydrated ? isOpen : initialOpen) || (settings.isHoverOpen && isHover);

  useEffect(() => {
    closeMobileSidebar();
  }, [pathname, isMobile]);

  if (settings.disabled) return null;

  return (
    <>
      <aside
        id="workspace-desktop-navigation"
        className={cn(
          "fixed top-0 left-0 z-40 hidden h-svh border-r border-sidebar-border bg-sidebar lg:block print:hidden motion-safe:transition-[width] motion-safe:duration-150",
          desktopOpen ? "w-56" : "w-[90px]",
        )}
      >
        <div
          onMouseEnter={() => setIsHover(true)}
          onMouseLeave={() => setIsHover(false)}
          className="h-full"
        >
          <SidebarContent expanded={desktopOpen} />
        </div>
      </aside>
      <Sheet open={isMobile && mobileDrawerOpen} onOpenChange={setMobileDrawerOpen}>
        <SheetContent
          id="workspace-mobile-navigation"
          side="left"
          className="w-56! max-w-[calc(100vw-3rem)] bg-sidebar text-sidebar-foreground overscroll-contain motion-reduce:transition-none motion-reduce:translate-none!"
        >
          <SheetTitle className="sr-only">Workspace navigation</SheetTitle>
          <SidebarContent expanded />
        </SheetContent>
      </Sheet>
    </>
  );
}
