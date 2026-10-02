"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { Ellipsis } from "@/components/icons";

import { CollapseMenuButton } from "@/components/app-nav/collapse-menu-button";
import { buttonVariants } from "@/components/ui/button-variants";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { closeMobileSidebar } from "@/hooks/use-sidebar";
import { buildMenuList } from "@/lib/menu-list";
import { cn } from "@/lib/utils";

type MenuProps = {
  isOpen?: boolean;
};

const getHrefPathname = (href: string) => {
  try {
    return new URL(href).pathname;
  } catch {
    return href;
  }
};

const isMenuActive = (pathname: string, href: string) => {
  const hrefPathname = getHrefPathname(href);
  if (hrefPathname === "/playground" && pathname === "/knowledge-base") return true;
  if (hrefPathname === "/") return pathname === "/" || pathname === "/dashboard";
  return pathname === hrefPathname || pathname.startsWith(`${hrefPathname}/`);
};

export function Menu({ isOpen }: MenuProps) {
  const pathname = usePathname();
  const menuItems = buildMenuList();

  return (
    <nav className="w-full" aria-label="Workspace">
      <ul className={cn("flex w-full flex-col items-stretch", isOpen === false ? "px-2" : "px-3")}>
        {menuItems.map(({ groupLabel, menus }) => (
          <li
            className={cn("w-full", groupLabel ? "py-2" : "")}
            key={groupLabel || menus.map((menu) => menu.href).join(":")}
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
            {menus.map(({ href, label, icon: Icon, active, submenus }) => {
              const isActive = active === undefined ? isMenuActive(pathname, href) : active;

              const hasActiveSubmenu = submenus?.some((submenu) => pathname.includes(submenu.href));

              const isCurrentActive = isActive || hasActiveSubmenu;

              if (!submenus || submenus.length === 0) {
                const button = (
                  <Link
                    href={href}
                    aria-label={label}
                    aria-current={isCurrentActive ? "page" : false}
                    className={cn(
                      buttonVariants({ variant: isCurrentActive ? "secondary" : "ghost" }),
                      "w-full h-11 lg:h-10 mb-1 relative overflow-hidden group cursor-pointer flex items-center transition-colors duration-150",
                      isOpen === false ? "justify-center px-0" : "justify-start px-4",
                      isCurrentActive && "bg-sidebar-accent text-sidebar-accent-foreground",
                    )}
                    onClick={() => closeMobileSidebar()}
                  >
                    <span
                      className={cn(
                        isOpen === false ? "" : "mr-4",
                        "flex-shrink-0 flex items-center justify-center",
                      )}
                    >
                      <Icon size={18} className={isCurrentActive ? "text-primary" : ""} />
                    </span>
                    {isOpen !== false && (
                      <p
                        className={cn(
                          "flex-1 min-w-0 truncate text-left",
                          isCurrentActive && "font-medium text-primary",
                        )}
                      >
                        {label}
                      </p>
                    )}
                    {isOpen && submenus && submenus.length > 0 && (
                      <span className="ml-auto px-1.5 py-0.5 text-xs rounded-full bg-primary/10 text-primary">
                        {submenus.length}
                      </span>
                    )}
                  </Link>
                );

                return (
                  <div className="w-full" key={href}>
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
              } else {
                return (
                  <div className="w-full" key={href}>
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
              }
            })}
          </li>
        ))}
      </ul>
    </nav>
  );
}
