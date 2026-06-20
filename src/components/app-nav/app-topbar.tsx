"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { CallUsageIndicator } from "@/components/app-nav/call-usage-indicator";
import { UserNav } from "@/components/app-nav/user-nav";
import { FeedbackForm } from "@/components/feedback/feedback-form";
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
import { useAgent, useCampaign, useKnowledgeBases } from "@/hooks/query";
import { useSidebar } from "@/hooks/use-sidebar";
import { useStore } from "@/hooks/use-store";
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
  campaigns: "Campaigns",
  conversations: "Conversations",

  dashboard: "Dashboard",
  echo: "Echo Widget",
  integrations: "Integrations",
  leads: "Leads",
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

type NamedEntity = {
  id?: string | null;
  name?: string | null;
  title?: string | null;
  contactName?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  campaign?: NamedEntity | null;
  agent?: NamedEntity | null;
  lead?: NamedEntity | null;
  data?: NamedEntity | null;
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
  if (previous === "campaigns") return "Campaign";
  if (previous === "agents") return "Agent";
  return formatSegment(segment);
}

function getName(entity: unknown): string | null {
  if (!entity || typeof entity !== "object") return null;
  const value = entity as NamedEntity;
  const nestedName: string | null =
    getName(value.campaign) || getName(value.agent) || getName(value.lead) || getName(value.data);
  const fullName = [value.firstName, value.lastName].filter(Boolean).join(" ").trim();
  return value.name || value.title || value.contactName || fullName || nestedName || null;
}

function useBreadcrumbLabels(segments: string[], editCampaignId = "") {
  const campaignIndex = segments.indexOf("campaigns");
  const agentsIndex = segments.indexOf("agents");
  const knowledgeBaseIndex = segments.indexOf("knowledge-base");
  const routeCampaignId = campaignIndex >= 0 ? (segments[campaignIndex + 1] ?? "") : "";
  const isCampaignCreateRoute = routeCampaignId === "new";
  const campaignId = isCampaignCreateRoute ? editCampaignId : routeCampaignId;
  const knowledgeBaseId = knowledgeBaseIndex >= 0 ? (segments[knowledgeBaseIndex + 1] ?? "") : "";
  const campaignAgentId = agentsIndex >= 0 ? (segments[agentsIndex + 1] ?? "") : "";
  const agentId = campaignAgentId || "";

  const campaignQuery = useCampaign(campaignId || "");
  const agentQuery = useAgent(agentId || "");
  const knowledgeBasesQuery = useKnowledgeBases();

  return useMemo(() => {
    const labels = new Map<string, string>();
    const campaignName = getName(campaignQuery.data);
    const agentName = getName(agentQuery.data);
    const knowledgeBase = (
      knowledgeBasesQuery.data as
        | { knowledgeBases?: Array<{ id: string; name?: string }> }
        | undefined
    )?.knowledgeBases?.find((item: { id: string; name?: string }) => item.id === knowledgeBaseId);

    if (campaignId && campaignName) labels.set(campaignId, campaignName);
    if (isCampaignCreateRoute) labels.set("new", campaignName || "New Campaign");
    if (agentId && agentName) labels.set(agentId, agentName);
    if (knowledgeBaseId) labels.set(knowledgeBaseId, knowledgeBase?.name ?? "Knowledge Base");

    return labels;
  }, [
    agentId,
    agentQuery.data,
    campaignId,
    campaignQuery.data,
    isCampaignCreateRoute,
    knowledgeBaseId,
    knowledgeBasesQuery.data,
  ]);
}

function getVisibleCrumbs(crumbs: Crumb[]) {
  if (crumbs.length <= 4) return { visible: crumbs, hidden: [] };
  return {
    visible: [crumbs[0], crumbs[1], crumbs[crumbs.length - 2], crumbs[crumbs.length - 1]],
    hidden: crumbs.slice(2, -2),
  };
}

function getBreadcrumbHref(routeSegments: string[], index: number) {
  const segment = routeSegments[index];
  const previous = routeSegments[index - 1];

  if (segment === "agents" && previous === routeSegments[1] && routeSegments[0] === "campaigns") {
    return `/${routeSegments.slice(0, index).join("/")}`;
  }

  if (segment === "leads") {
    if (routeSegments[0] === "campaigns") {
      if (previous === routeSegments[3] && routeSegments[2] === "agents") {
        return `/${routeSegments.slice(0, index).join("/")}`;
      }
      return `/${routeSegments.slice(0, 2).join("/")}`;
    }
  }

  return `/${routeSegments.slice(0, index + 1).join("/")}`;
}

function Breadcrumbs() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const segments = useMemo(() => pathname.split("/").filter(Boolean), [pathname]);
  const isCampaignCreateRoute = segments[0] === "campaigns" && segments[1] === "new";
  const editCampaignId = isCampaignCreateRoute ? (searchParams.get("edit") ?? "") : "";
  const labels = useBreadcrumbLabels(segments, editCampaignId);
  const [campaignDraftLabel, setCampaignDraftLabel] = useState("");

  useEffect(() => {
    if (!isCampaignCreateRoute) {
      setCampaignDraftLabel("");
      return;
    }

    const handleCampaignDraftName = (event: Event) => {
      const detail = (event as CustomEvent<{ label?: string }>).detail;
      setCampaignDraftLabel(detail?.label?.trim() ?? "");
    };

    window.addEventListener("outcaller:campaign-draft-name", handleCampaignDraftName);
    return () => {
      window.removeEventListener("outcaller:campaign-draft-name", handleCampaignDraftName);
    };
  }, [isCampaignCreateRoute]);

  const crumbs = useMemo<Crumb[]>(() => {
    const routeSegments = segments.length > 0 ? segments : ["dashboard"];
    const routeCrumbs = routeSegments.map((segment, index) => {
      const isCurrent = index === routeSegments.length - 1;
      const liveCampaignLabel =
        isCampaignCreateRoute && isCurrent
          ? campaignDraftLabel || labels.get("new") || "New Campaign"
          : null;

      return {
        href: getBreadcrumbHref(routeSegments, index),
        label:
          liveCampaignLabel ??
          labels.get(segment) ??
          getFallbackLabel(segment, index, routeSegments),
        current: isCurrent,
      };
    });

    return [{ href: getDashboardHref(), label: "Home" }, ...routeCrumbs];
  }, [campaignDraftLabel, isCampaignCreateRoute, labels, segments]);
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
  const sidebar = useStore(useSidebar, (state) => state) as {
    toggleOpen: (force?: boolean) => void;
    settings: { disabled?: boolean };
  } | null;
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
        sidebar?.toggleOpen();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [sidebar]);

  return (
    <header className="sticky top-0 z-10 flex h-14 items-center justify-between gap-4 border-b border-border bg-card px-4 sm:px-8 print:hidden">
      <div className="flex min-w-0 flex-1 items-center gap-3 overflow-hidden sm:gap-4">
        {!sidebar?.settings.disabled && (
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
                      onClick={() => sidebar?.toggleOpen()}
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
        <CallUsageIndicator />
        <FeedbackForm triggerVariant="navbar" />
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
