"use client";

import { useMemo } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Ellipsis } from "@/components/icons";

import { CollapseMenuButton } from "@/components/app-nav/collapse-menu-button";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { buildMenuList, buildWorkspaceMenuList, type MenuItem } from "@/lib/menu-list";
import { useSidebar } from "@/hooks/use-sidebar";
import { cn } from "@/lib/utils";

type MenuProps = {
  isOpen?: boolean;
  variant?: "workspace" | "agent";
};

const getHrefPathname = (href: string) => {
  try {
    return new URL(href, "http://localhost").pathname;
  } catch {
    return href.split("?")[0] ?? href;
  }
};

function pathsMatch(pathname: string, href: string, searchParams: URLSearchParams): boolean {
  const hrefPathname = getHrefPathname(href);
  if (pathname !== hrefPathname && !pathname.startsWith(`${hrefPathname}/`)) {
    return false;
  }

  const queryIndex = href.indexOf("?");
  if (queryIndex === -1) {
    return true;
  }

  const hrefQuery = new URLSearchParams(href.slice(queryIndex + 1));
  for (const [key, value] of hrefQuery.entries()) {
    if (searchParams.get(key) !== value) {
      return false;
    }
  }

  return true;
}

function resolveActiveMenuId(
  pathname: string,
  searchParams: URLSearchParams,
  menus: MenuItem[],
): string | null {
  for (const menu of menus) {
    if (menu.active === false) continue;

    if (menu.submenus.length > 0) {
      const submenuMatch = menu.submenus.some((submenu) =>
        pathsMatch(pathname, submenu.href, searchParams),
      );
      if (submenuMatch || pathsMatch(pathname, menu.href, searchParams)) {
        return menu.id;
      }
      continue;
    }

    if (pathsMatch(pathname, menu.href, searchParams)) {
      return menu.id;
    }
  }

  return null;
}

export function Menu({ isOpen, variant = "agent" }: MenuProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const closeOnMobile = useSidebar((state) => state.closeOnMobile);
  const menuItems = variant === "workspace" ? buildWorkspaceMenuList() : buildMenuList();

  const flatMenus = useMemo(() => menuItems.flatMap((group) => group.menus), [menuItems]);

  const activeMenuId = useMemo(
    () => resolveActiveMenuId(pathname, searchParams, flatMenus),
    [pathname, searchParams, flatMenus],
  );

  return (
    <nav className="h-full w-full">
      <ul className="flex w-full flex-col items-stretch px-2 py-3">
        {menuItems.map(({ groupLabel, menus }) => (
          <li
            className={cn("w-full", groupLabel ? "py-2" : "")}
            key={groupLabel || menus.map((menu) => menu.id).join(":")}
          >
            {(isOpen && groupLabel) || isOpen === undefined ? (
              <p className="text-sm font-medium text-muted-foreground px-2.5 pb-2 w-full truncate">
                {groupLabel}
              </p>
            ) : !isOpen && isOpen !== undefined && groupLabel ? (
              <TooltipProvider delay={100}>
                <Tooltip>
                  <TooltipTrigger
                    render={
                      <div className="flex items-center justify-center w-full cursor-pointer">
                        <Ellipsis className="w-5 h-5" />
                      </div>
                    }
                  />
                  <TooltipContent side="right">
                    <p>{groupLabel}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            ) : (
              <p className="pb-2"></p>
            )}
            {menus.map(({ id, href, label, icon: Icon, submenus, badge, badgeVariant }) => {
              const isCurrentActive = activeMenuId === id;

              if (!submenus || submenus.length === 0) {
                const button = (
                  <Button
                    variant="ghost"
                    className={cn(
                      "group mb-1 flex h-10 w-full cursor-pointer items-center rounded-xl transition-colors",
                      isOpen === false ? "justify-center px-0" : "justify-start px-3",
                      isCurrentActive
                        ? "bg-sidebar-accent font-medium text-sidebar-accent-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                        : "text-foreground hover:bg-sidebar-accent/60",
                    )}
                    onClick={() => {
                      closeOnMobile();
                      router.push(href);
                    }}
                  >
                    <span
                      className={cn(
                        "flex shrink-0 items-center justify-center",
                        isOpen === false ? "" : "mr-3",
                        isCurrentActive
                          ? "text-sidebar-accent-foreground"
                          : "text-muted-foreground",
                      )}
                    >
                      <Icon size={18} />
                    </span>
                    {isOpen !== false && (
                      <p className="min-w-0 flex-1 truncate text-left text-sm font-medium">
                        {label}
                      </p>
                    )}
                    {isOpen && badge ? (
                      <span
                        className={cn(
                          "ml-auto rounded px-1.5 py-0.5 text-[10px] font-medium",
                          badgeVariant === "coming-soon"
                            ? "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400"
                            : "bg-foreground text-background",
                        )}
                      >
                        {badge}
                      </span>
                    ) : null}
                  </Button>
                );

                return (
                  <div className="w-full" key={id}>
                    {isOpen === false ? (
                      <TooltipProvider delay={100}>
                        <Tooltip>
                          <TooltipTrigger render={button} />
                          <TooltipContent side="right">{label}</TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    ) : (
                      button
                    )}
                  </div>
                );
              }

              return (
                <div className="w-full" key={id}>
                  <CollapseMenuButton
                    icon={Icon}
                    label={label}
                    active={isCurrentActive}
                    submenus={submenus}
                    isOpen={isOpen}
                    badgeCount={submenus.length}
                    href={href}
                  />
                </div>
              );
            })}
          </li>
        ))}
      </ul>
    </nav>
  );
}
