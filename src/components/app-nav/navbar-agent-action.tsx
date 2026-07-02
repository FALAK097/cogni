"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import { Check, ChevronDown, ChevronUp, LayoutGrid, Plus, Search } from "@/components/icons";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { useWidgetConfig } from "@/hooks/query";
import { useActiveWorkspaceId } from "@/hooks/use-auth";
import { useSidebar } from "@/hooks/use-sidebar";
import { startAgentSetupAction } from "@/features/onboarding/actions";
import { isWorkspaceRoute } from "@/lib/workspace-routing";
import { cn } from "@/lib/utils";

type AgentOption = {
  id: string;
  name: string;
};

type NavbarAgentActionProps = {
  className?: string;
};

export function NavbarAgentAction({ className }: NavbarAgentActionProps) {
  const router = useRouter();
  const pathname = usePathname();
  const workspaceView = isWorkspaceRoute(pathname);
  const activeWorkspaceId = useActiveWorkspaceId();
  const { data: widget, isLoading } = useWidgetConfig(activeWorkspaceId ?? "");
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);

  const agents = useMemo<AgentOption[]>(() => {
    if (!widget) return [];

    return [
      {
        id: widget.publicKey,
        name: widget.displayName ?? widget.agentName ?? "Support Agent",
      },
    ];
  }, [widget]);

  const activeAgentId = widget?.publicKey ?? null;
  const activeAgentName = agents[0]?.name ?? "Agent";

  const visibleAgents = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) return agents;
    return agents.filter((agent) => agent.name.toLowerCase().includes(normalizedQuery));
  }, [agents, query]);

  function openAgentDashboard() {
    setOpen(false);
    useSidebar.getState().closeOnMobile();
    router.push("/backstage");
  }

  if (!activeWorkspaceId || isLoading) {
    return (
      <Button
        variant="ghost"
        size="sm"
        className={cn("h-9 max-w-[16rem] gap-2 px-2 font-normal", className)}
        disabled
      >
        <span className="truncate text-sm font-semibold">Agent</span>
        <Badge variant="secondary" className="h-5 shrink-0 rounded px-1.5 text-[10px] font-medium">
          Agent
        </Badge>
        <span className="flex shrink-0 flex-col text-muted-foreground">
          <ChevronUp className="size-3" />
          <ChevronDown className="-mt-1 size-3" />
        </span>
      </Button>
    );
  }

  return (
    <DropdownMenu
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen);
        if (!nextOpen) setQuery("");
      }}
    >
      <DropdownMenuTrigger
        render={
          <Button
            variant="ghost"
            size="sm"
            className={cn(
              "h-9 max-w-[16rem] gap-2 px-2 font-normal hover:bg-sidebar-accent/60 data-open:bg-sidebar-accent data-open:text-sidebar-accent-foreground",
              className,
            )}
          >
            <span className="truncate text-sm font-semibold">{activeAgentName}</span>
            <Badge
              variant="secondary"
              className="h-5 shrink-0 rounded px-1.5 text-[10px] font-medium"
            >
              Agent
            </Badge>
            <span className="flex shrink-0 flex-col text-muted-foreground">
              <ChevronUp className="size-3" />
              <ChevronDown className="-mt-1 size-3" />
            </span>
          </Button>
        }
      />

      <DropdownMenuContent align="start" className="w-72 p-2">
        {workspaceView ? (
          widget ? (
            <DropdownMenuItem
              className="mb-2 cursor-pointer rounded-xl"
              onClick={openAgentDashboard}
            >
              <LayoutGrid className="size-4" />
              Open agent dashboard
            </DropdownMenuItem>
          ) : null
        ) : (
          <DropdownMenuItem
            render={
              <Link
                href="/agents"
                className="mb-2 cursor-pointer rounded-xl"
                onClick={() => useSidebar.getState().closeOnMobile()}
              />
            }
          >
            <LayoutGrid className="size-4" />
            All agents
          </DropdownMenuItem>
        )}

        <div
          role="presentation"
          className="relative mb-2"
          onPointerDown={(event) => event.stopPropagation()}
          onKeyDown={(event) => event.stopPropagation()}
        >
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search Agent..."
            className="h-9 rounded-xl border-border bg-background pl-9"
          />
        </div>

        <div className="max-h-56 space-y-1 overflow-y-auto">
          {visibleAgents.length > 0 ? (
            visibleAgents.map((agent) => {
              const isActive = agent.id === activeAgentId;

              return (
                <button
                  key={agent.id}
                  type="button"
                  className={cn(
                    "flex w-full items-center justify-between rounded-xl px-3 py-2 text-left transition-colors",
                    isActive ? "bg-muted text-foreground" : "text-foreground hover:bg-muted/70",
                  )}
                  onClick={openAgentDashboard}
                >
                  <span className="truncate text-sm font-medium">{agent.name}</span>
                  {isActive ? <Check className="size-4 shrink-0 text-primary" /> : null}
                </button>
              );
            })
          ) : (
            <p className="px-3 py-2 text-sm text-muted-foreground">No agents found</p>
          )}
        </div>

        <DropdownMenuSeparator className="my-2" />

        <form action={startAgentSetupAction}>
          <Button
            type="submit"
            variant="outline"
            className="h-10 w-full justify-center gap-2 rounded-xl text-sm font-medium"
          >
            <Plus className="size-4" />
            Create agent
          </Button>
        </form>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
