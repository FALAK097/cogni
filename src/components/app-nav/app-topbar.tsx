"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect } from "react";

import { UserNav } from "@/components/app-nav/user-nav";
import { ChevronRight, Home, MoreHorizontal, PanelLeft } from "@/components/icons";
import { ModeToggle } from "@/components/mode-toggle";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useKnowledgeBases } from "@/hooks/query";
import { useSidebar } from "@/hooks/use-sidebar";
import { getDashboardHref } from "@/lib/deployment-urls";
import { cn } from "@/lib/utils";

type AppTopbarProps = {
  userData?: {
    avatar?: string;
    name?: string;
    email?: string;
  };
};

const LABELS: Record<string, string> = {
  analytics: "Analytics",
  "knowledge-base": "Knowledge Base",
  conversations: "Conversations",

  dashboard: "Dashboard",
  widget: "Widget",
  integrations: "Integrations",
  settings: "Settings",
  usage: "Usage",
  whatsapp: "WhatsApp",
  workspace: "Workspace",
};

type Crumb = {
  href: string;
  label: string;
  current?: boolean;
};

function formatSegment(segment: string) {
  if (segment.includes("--")) return formatSegment(segment.split("--")[0] || "details");
  if (LABELS[segment]) return LABELS[segment];
  if (/^[0-9a-f-]{8,}$/i.test(segment)) return "Details";
  return segment
    .split("-")
    .map((part) =>
      part === "whatsapp" ? "WhatsApp" : part.charAt(0).toUpperCase() + part.slice(1),
    )
    .join(" ");
}

function getFallbackLabel(segment: string, index: number, routeSegments: string[]) {
  const previous = routeSegments[index - 1];
  if (previous === "agents") return "Agent";
  return formatSegment(segment);
}

function useBreadcrumbLabels(segments: string[]) {
  const knowledgeBaseIndex = segments.indexOf("knowledge-base");
  const knowledgeBaseId = knowledgeBaseIndex >= 0 ? (segments[knowledgeBaseIndex + 1] ?? "") : "";

  const knowledgeBasesQuery = useKnowledgeBases();

  const labels = new Map<string, string>();
  const knowledgeBase = knowledgeBasesQuery.data?.knowledgeBases?.find(
    (item) => item.id === knowledgeBaseId,
  );

  if (knowledgeBaseId) labels.set(knowledgeBaseId, knowledgeBase?.name ?? "Knowledge Base");

  return labels;
}

function getVisibleCrumbs(crumbs: Crumb[]) {
  if (crumbs.length <= 4) return { visible: crumbs, hidden: [] };
  return {
    visible: [crumbs[0], crumbs[1], crumbs[crumbs.length - 2], crumbs[crumbs.length - 1]],
    hidden: crumbs.slice(2, -2),
  };
}

function getBreadcrumbHref(routeSegments: string[], index: number) {
  return `/${routeSegments.slice(0, index + 1).join("/")}`;
}

function Breadcrumbs() {
  const pathname = usePathname();
  const segments = pathname.split("/").filter(Boolean);
  const labels = useBreadcrumbLabels(segments);

  const routeSegments = segments.length > 0 ? segments : ["dashboard"];
  const routeCrumbs = routeSegments.map((segment, index) => {
    const isCurrent = index === routeSegments.length - 1;

    return {
      href: getBreadcrumbHref(routeSegments, index),
      label: labels.get(segment) ?? getFallbackLabel(segment, index, routeSegments),
      current: isCurrent,
    };
  });

  const crumbs: Crumb[] = [{ href: getDashboardHref(), label: "Home" }, ...routeCrumbs];
  const isCompact = crumbs.length > 2;
  const { visible, hidden } = getVisibleCrumbs(crumbs);

  return (
    <Breadcrumb className="min-w-0">
      <BreadcrumbList className="flex-nowrap gap-1 text-sm sm:text-base">
        {visible.map((crumb, index) => {
          const isHome = crumb.href === getDashboardHref();
          return (
            <div
              className={cn(
                "contents",
                isCompact && isHome && "max-[640px]:hidden",
                isCompact && !crumb.current && index < visible.length - 2 && "max-[640px]:hidden",
              )}
              key={`${crumb.href}-${index}`}
            >
              {index > 0 && (
                <BreadcrumbSeparator
                  className={cn(
                    "shrink-0",
                    isCompact && index < visible.length - 1 && "max-[640px]:hidden",
                  )}
                >
                  <ChevronRight className="size-4" />
                </BreadcrumbSeparator>
              )}
              {index === 2 && hidden.length > 0 && (
                <>
                  <BreadcrumbItem className="shrink-0">
                    <DropdownMenu>
                      <DropdownMenuTrigger
                        render={
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-xs"
                            className="size-7 cursor-pointer"
                            aria-label="Show hidden breadcrumbs"
                          >
                            <MoreHorizontal className="size-4" />
                          </Button>
                        }
                      />
                      <DropdownMenuContent align="start" className="w-56">
                        {hidden.map((hiddenCrumb) => (
                          <DropdownMenuItem
                            key={hiddenCrumb.href}
                            render={<Link href={hiddenCrumb.href} />}
                            className="cursor-pointer"
                          >
                            <span className="truncate">{hiddenCrumb.label}</span>
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </BreadcrumbItem>
                  <BreadcrumbSeparator className="shrink-0">
                    <ChevronRight className="size-4" />
                  </BreadcrumbSeparator>
                </>
              )}
              <BreadcrumbItem className="min-w-0 shrink">
                {crumb.current ? (
                  <BreadcrumbPage className="truncate font-medium text-foreground">
                    {crumb.label}
                  </BreadcrumbPage>
                ) : (
                  <BreadcrumbLink
                    render={<Link href={crumb.href} className="flex min-w-0 items-center gap-2" />}
                  >
                    {crumb.href === getDashboardHref() && <Home className="size-4 shrink-0" />}
                    <span className="truncate">{crumb.label}</span>
                  </BreadcrumbLink>
                )}
              </BreadcrumbItem>
            </div>
          );
        })}
      </BreadcrumbList>
    </Breadcrumb>
  );
}

export function AppTopbar({ userData }: AppTopbarProps) {
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
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "b") {
        event.preventDefault();
        toggleOpen();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [toggleOpen]);

  return (
    <header className="sticky top-0 z-10 flex h-14 items-center justify-between gap-4 border-b border-border bg-card px-4 sm:px-8 print:hidden">
      <div className="flex min-w-0 flex-1 items-center gap-3 overflow-hidden sm:gap-4">
        {!sidebarDisabled && (
          <>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger
                  render={
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="size-9 shrink-0"
                      onClick={() => toggleOpen()}
                      aria-label={`Toggle sidebar (${shortcutLabel})`}
                    >
                      <PanelLeft className="size-5" />
                    </Button>
                  }
                />
                <TooltipContent side="bottom" className="px-2.5 py-1.5">
                  <span className="text-xs font-medium">{shortcutLabel}</span>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <div className="h-6 w-px shrink-0 bg-border" />
          </>
        )}
        <Breadcrumbs />
      </div>
      <div className="flex shrink-0 items-center gap-1 sm:gap-2">
        <ModeToggle />
        <UserNav
          userData={normalizedUserData}
          trigger={
            <Button
              variant="ghost"
              size="icon"
              className="relative size-9 rounded-md bg-transparent p-0 hover:bg-transparent"
              title="Profile"
              aria-label="Open profile menu"
            >
              <Avatar className="size-8 cursor-pointer">
                <AvatarImage src={normalizedUserData.avatar} alt={normalizedUserData.name} />
                <AvatarFallback>
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
