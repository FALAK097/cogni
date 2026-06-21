"use client";

import { usePathname, useRouter } from "next/navigation";
import { Ellipsis } from "@/components/icons";

import { CollapseMenuButton } from "@/components/app-nav/collapse-menu-button";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
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
  if (hrefPathname === "/") return pathname === "/" || pathname === "/dashboard";
  return pathname === hrefPathname || pathname.startsWith(`${hrefPathname}/`);
};

export function Menu({ isOpen }: MenuProps) {
  const pathname = usePathname();
  const router = useRouter();
  const menuItems = buildMenuList();

  return (
    <nav className="w-full h-full">
      <ul className="flex flex-col w-full min-h-[calc(100vh-48px-36px-16px-56px)] lg:min-h-[calc(100vh-32px-40px-56px)] items-stretch px-3">
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
                  <Button
                    variant={isCurrentActive ? "secondary" : "ghost"}
                    className={cn(
                      "w-full h-10 mb-2 relative overflow-hidden group cursor-pointer flex items-center transition-[justify-content,padding]",
                      isOpen === false ? "justify-center px-0" : "justify-start px-4",
                      isCurrentActive && "shadow-sm",
                    )}
                    onClick={() => router.push(href)}
                  >
                    {isCurrentActive && (
                      <div className="absolute inset-0 transition-opacity duration-300 opacity-100">
                        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(0,0,0,0.02)_1px,transparent_1px)] dark:bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[length:4px_4px]" />
                      </div>
                    )}
                    {isCurrentActive && (
                      <div className="absolute inset-0 p-px transition-opacity duration-300 rounded-md opacity-100 -z-10 bg-gradient-to-br from-transparent via-border to-transparent" />
                    )}
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
                  </Button>
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
