"use client";

import { useEffect } from "react";

import { NavbarAgentAction } from "@/components/app-nav/navbar-agent-action";
import { UserNav } from "@/components/app-nav/user-nav";
import { BookOpen, Clock, HelpCircle, PanelLeft } from "@/components/icons";
import { ModeToggle } from "@/components/mode-toggle";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useSidebar } from "@/hooks/use-sidebar";

type AppShellNavbarProps = {
  userData?: {
    avatar?: string;
    name?: string;
    email?: string;
  };
  showAgentSwitcher?: boolean;
};

export function AppShellNavbar({ userData, showAgentSwitcher = true }: AppShellNavbarProps) {
  const toggleOpen = useSidebar((state) => state.toggleOpen);
  const sidebarDisabled = useSidebar((state) => state.settings.disabled);

  const normalizedUserData = {
    avatar: userData?.avatar ?? "",
    name: userData?.name ?? "Unknown",
    email: userData?.email ?? "",
  };

  const shortcutLabel =
    typeof navigator !== "undefined" && /Mac|iPhone|iPad|iPod/.test(navigator.platform)
      ? "⌘ + B"
      : "CTRL+B";

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (sidebarDisabled) return;
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "b") {
        event.preventDefault();
        toggleOpen();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [sidebarDisabled, toggleOpen]);

  return (
    <header className="flex h-12 shrink-0 items-center justify-between border-b border-border bg-background px-3 sm:px-4 print:hidden">
      <div className="flex min-w-0 flex-1 items-center gap-2 overflow-visible">
        {!sidebarDisabled ? (
          <>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger
                  render={
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="size-8 shrink-0"
                      onClick={() => toggleOpen()}
                      aria-label={`Toggle sidebar (${shortcutLabel})`}
                    >
                      <PanelLeft className="size-4" />
                    </Button>
                  }
                />
                <TooltipContent side="bottom" className="hidden px-2.5 py-1.5 lg:block">
                  <span className="text-xs font-medium">{shortcutLabel}</span>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <div className="hidden h-4 w-px shrink-0 bg-border sm:block" />
          </>
        ) : null}

        {showAgentSwitcher ? <NavbarAgentAction /> : null}
      </div>

      <div className="flex shrink-0 items-center gap-0.5">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger
              render={
                <Button variant="ghost" size="icon" className="size-8" aria-label="History">
                  <Clock className="size-4" />
                </Button>
              }
            />
            <TooltipContent>History</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger
              render={
                <Button variant="ghost" size="icon" className="size-8" aria-label="Documentation">
                  <BookOpen className="size-4" />
                </Button>
              }
            />
            <TooltipContent>Documentation</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger
              render={
                <Button variant="ghost" size="icon" className="size-8" aria-label="Help">
                  <HelpCircle className="size-4" />
                </Button>
              }
            />
            <TooltipContent>Help</TooltipContent>
          </Tooltip>
        </TooltipProvider>

        <div className="mx-1 hidden h-4 w-px bg-border sm:block" />

        <ModeToggle />

        <div className="mx-1 hidden h-4 w-px bg-border sm:block" />

        <UserNav
          userData={normalizedUserData}
          trigger={
            <Button
              variant="ghost"
              size="icon"
              className="size-8 rounded-full p-0"
              aria-label="Open profile menu"
            >
              <Avatar className="size-7">
                <AvatarImage src={normalizedUserData.avatar} alt={normalizedUserData.name} />
                <AvatarFallback className="text-xs">
                  {normalizedUserData.name.substring(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
            </Button>
          }
          isSidebarOpen
        />
      </div>
    </header>
  );
}
