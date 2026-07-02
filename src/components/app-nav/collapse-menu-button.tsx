"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { ChevronDownIcon, ChevronRightIcon } from "@/components/icons";

import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useSidebar } from "@/hooks/use-sidebar";
import { cn } from "@/lib/utils";

type CollapseMenuButtonProps = {
  icon: React.ComponentType<{ size?: number; className?: string }>;
  label: string;
  active?: boolean;
  submenus: Array<{ href: string; label: string; active?: boolean }>;
  isOpen?: boolean;
  href?: string;
  badgeCount?: number;
  isLoading?: boolean;
};

export function CollapseMenuButton({
  icon: Icon,
  label,
  active,
  submenus,
  isOpen,
  href,
  isLoading,
}: CollapseMenuButtonProps) {
  const router = useRouter();
  const pathname = usePathname();
  const closeOnMobile = useSidebar((state) => state.closeOnMobile);
  const isSubmenuActive = submenus.some((submenu) =>
    submenu.active === undefined ? submenu.href === pathname : submenu.active,
  );
  const isMenuActive = active || isSubmenuActive;
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const wasMenuActiveRef = useRef(isMenuActive);
  const isExpanded = isCollapsed;

  useEffect(() => {
    const wasActive = wasMenuActiveRef.current;
    wasMenuActiveRef.current = isMenuActive;
    if (!wasActive && isMenuActive) {
      setIsCollapsed(true);
    }
  }, [isMenuActive]);

  return isOpen ? (
    <Collapsible open={isExpanded} onOpenChange={setIsCollapsed} className="mb-1 w-full">
      <div
        className={cn(
          "relative mb-1 flex h-10 overflow-hidden rounded-xl transition-colors hover:bg-muted dark:hover:bg-muted/50",
          isMenuActive && "bg-secondary text-secondary-foreground shadow-sm hover:bg-secondary/80",
        )}
      >
        {isMenuActive && (
          <div className="absolute inset-0 transition-opacity duration-300 opacity-100">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(0,0,0,0.02)_1px,transparent_1px)] dark:bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[length:4px_4px]" />
          </div>
        )}
        {isMenuActive && (
          <div className="absolute inset-0 p-px transition-opacity duration-300 rounded-xl opacity-100 -z-10 bg-gradient-to-br from-transparent via-border to-transparent" />
        )}
        <Button
          variant="ghost"
          className={cn(
            "relative h-full flex-1 justify-start rounded-none bg-transparent px-4 hover:bg-transparent aria-expanded:bg-transparent dark:hover:bg-transparent",
            isMenuActive && "hover:text-secondary-foreground",
          )}
          onClick={() => {
            setIsCollapsed((prev) => !prev);
            if (href && !isExpanded) {
              closeOnMobile();
              router.push(href);
            }
          }}
        >
          <div className="flex min-w-0 flex-1 items-center">
            <span className="mr-4 flex-shrink-0">
              <Icon size={18} className={isMenuActive ? "text-primary" : ""} />
            </span>
            <p
              className={cn(
                "flex-1 min-w-0 truncate text-left",
                isOpen ? "translate-x-0 opacity-100" : "-translate-x-96 opacity-0",
                isMenuActive && "font-medium text-primary",
              )}
            >
              {label}
            </p>
          </div>
        </Button>

        <CollapsibleTrigger
          render={
            <Button
              variant="ghost"
              className={cn(
                "relative h-full w-10 rounded-none bg-transparent px-0 transition-colors hover:bg-transparent aria-expanded:bg-transparent dark:hover:bg-transparent",
                isMenuActive && "hover:text-secondary-foreground",
              )}
              aria-label={`${isExpanded ? "Collapse" : "Expand"} ${label} submenu`}
            >
              {isExpanded ? (
                <ChevronDownIcon
                  className={cn("h-[18px] w-[18px]", isMenuActive && "text-primary")}
                />
              ) : (
                <ChevronRightIcon
                  className={cn("h-[18px] w-[18px]", isMenuActive && "text-primary")}
                />
              )}
            </Button>
          }
        />
      </div>

      <CollapsibleContent className="overflow-hidden data-[state=closed]:animate-collapsible-up data-[state=open]:animate-collapsible-down">
        <div className="ml-[18px] mb-1 border-l border-border/80 py-1 pl-4">
          {submenus.map(({ href, label, active }) => {
            const isSubmenuItemActive = active === undefined ? pathname === href : active;

            return (
              <Button
                key={href}
                variant="ghost"
                nativeButton={false}
                render={
                  <Link
                    href={href}
                    onClick={() => {
                      closeOnMobile();
                    }}
                  />
                }
                className={cn(
                  "mb-1 h-9 w-full justify-start rounded-md bg-transparent px-3 text-left transition-colors",
                  isSubmenuItemActive && "hover:bg-transparent",
                )}
              >
                <span
                  className={cn(
                    "min-w-0 truncate",
                    isSubmenuItemActive && "font-medium text-primary",
                  )}
                >
                  {label}
                </span>
              </Button>
            );
          })}
          {isLoading && (
            <p className="px-3 py-2 text-sm text-muted-foreground">Loading navigation...</p>
          )}
        </div>
      </CollapsibleContent>
    </Collapsible>
  ) : (
    <DropdownMenu open={dropdownOpen} onOpenChange={setDropdownOpen}>
      <TooltipProvider delay={100}>
        <Tooltip>
          <TooltipTrigger
            render={
              <DropdownMenuTrigger
                render={
                  <Button
                    variant={isMenuActive ? "secondary" : "ghost"}
                    className={cn(
                      "w-full h-10 mb-1 relative overflow-hidden flex items-center transition-[justify-content,padding]",
                      isOpen === false ? "justify-center px-0" : "justify-start px-4",
                      isMenuActive && "shadow-sm",
                    )}
                  >
                    {isMenuActive && (
                      <div className="absolute inset-0 transition-opacity duration-300 opacity-100">
                        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(0,0,0,0.02)_1px,transparent_1px)] dark:bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[length:4px_4px]" />
                      </div>
                    )}
                    {isMenuActive && (
                      <div className="absolute inset-0 p-px transition-opacity duration-300 rounded-md opacity-100 -z-10 bg-gradient-to-br from-transparent via-border to-transparent" />
                    )}
                    <div
                      className={cn(
                        "flex items-center w-full",
                        isOpen === false ? "justify-center" : "justify-between",
                      )}
                    >
                      <div
                        className={cn(
                          "flex items-center min-w-0",
                          isOpen === false ? "justify-center" : "gap-4 flex-1",
                        )}
                      >
                        <span className="flex-shrink-0 flex items-center justify-center">
                          <Icon size={18} className={isMenuActive ? "text-primary" : ""} />
                        </span>
                        {isOpen !== false && (
                          <p
                            className={cn(
                              "flex-1 min-w-0 truncate text-left",
                              isMenuActive && "font-medium text-primary",
                            )}
                          >
                            {label}
                          </p>
                        )}
                      </div>
                    </div>
                  </Button>
                }
              />
            }
          />
          <TooltipContent side="right" align="start" alignOffset={2}>
            {label}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
      <DropdownMenuContent side="right" sideOffset={25} align="start">
        <DropdownMenuLabel
          className="max-w-[190px] truncate cursor-pointer hover:bg-secondary"
          onClick={() => {
            setDropdownOpen(false);
            if (href) {
              router.push(href);
            }
          }}
        >
          {label}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {submenus.map(({ href, label, active }) => {
          const isSubmenuItemActive = (active === undefined && pathname === href) || active;

          return (
            <DropdownMenuItem
              key={href}
              onClick={() => {
                setDropdownOpen(false);
                closeOnMobile();
              }}
              render={
                <Link
                  className={cn(
                    "cursor-pointer",
                    isSubmenuItemActive && "bg-secondary font-medium text-primary",
                  )}
                  href={href}
                />
              }
            >
              <p className="max-w-[180px] truncate">{label}</p>
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
