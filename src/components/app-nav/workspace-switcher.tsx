"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { Check, ChevronDown, ChevronUp, FolderKanban, LayoutGrid, Plus } from "@/components/icons";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useWorkspaces } from "@/hooks/query";
import { useAuthMe, useSwitchWorkspace } from "@/hooks/use-auth";
import { useSidebar } from "@/hooks/use-sidebar";
import { isWorkspaceRoute } from "@/lib/workspace-routing";
import { cn } from "@/lib/utils";

type WorkspaceSwitcherProps = {
  isOpen?: boolean;
};

// Workspace creation is enabled via the sidebar dropdown.

type WorkspaceWorkspace = {
  id: string;
  name: string;
  type?: string | null;
  ownerUserId?: string | null;
  isPrimary?: boolean | null;
  planType?: string | null;
};

type WorkspaceData = {
  workspaces?: WorkspaceWorkspace[];
};

export function WorkspaceSwitcher({ isOpen }: WorkspaceSwitcherProps) {
  const pathname = usePathname();
  const workspaceView = isWorkspaceRoute(pathname);
  const authMeQuery = useAuthMe();
  const { data: workspace, isLoading: workspacesLoading } = useWorkspaces();
  const switchWorkspace = useSwitchWorkspace();
  const workspaceData = workspace as WorkspaceData | undefined;
  const workspaces = workspaceData?.workspaces ?? [];
  const activeWorkspaceId = authMeQuery.data?.session?.activeWorkspaceId ?? null;
  const loading = authMeQuery.isLoading || workspacesLoading;
  const activeWorkspace = workspaces.find((workspace) => workspace.id === activeWorkspaceId);
  const activeWorkspaceName = activeWorkspace?.name || "Select Workspace";

  const handleSwitch = async (workspaceId: string) => {
    if (workspaceId === activeWorkspaceId) return;

    try {
      await switchWorkspace.mutateAsync(workspaceId);
      window.dispatchEvent(new CustomEvent("workspace-switched"));
      useSidebar.getState().closeOnMobile();
      window.location.assign(workspaceView ? "/agents" : "/backstage");
    } catch (error) {
      console.error("Failed to switch workspace:", error);
    }
  };

  if (loading) {
    return (
      <Button
        variant="ghost"
        disabled
        className={cn(
          "mx-0 h-9 w-full justify-between rounded-xl font-normal",
          isOpen ? "px-1" : "justify-center px-0",
        )}
      >
        <FolderKanban className="size-4 shrink-0 text-muted-foreground" />
        {isOpen ? <span className="truncate text-sm font-medium">Workspace</span> : null}
      </Button>
    );
  }

  if (workspaces.length === 0) {
    return (
      <Button
        type="button"
        variant="ghost"
        className={cn(
          "mx-0 h-9 w-full justify-start rounded-xl font-normal hover:bg-sidebar-accent/60",
          isOpen ? "gap-2.5 px-1" : "justify-center px-0",
        )}
        onClick={() => window.dispatchEvent(new CustomEvent("open-create-workspace"))}
        title={!isOpen ? "Create workspace" : undefined}
      >
        <Plus className="size-4 shrink-0 text-muted-foreground" />
        {isOpen ? <span className="truncate text-sm font-medium">Create workspace</span> : null}
      </Button>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            variant="ghost"
            data-testid="workspace-switcher-trigger"
            className={cn(
              "mx-0 h-9 w-full justify-between rounded-xl font-normal hover:bg-sidebar-accent/60 data-open:bg-sidebar-accent data-open:text-sidebar-accent-foreground",
              isOpen ? "px-1" : "justify-center px-0",
            )}
            title={!isOpen ? activeWorkspaceName : undefined}
          >
            <div className={cn("flex min-w-0 items-center gap-2.5", isOpen && "flex-1")}>
              <FolderKanban className="size-4 shrink-0 text-muted-foreground" />
              {isOpen && (
                <span className="min-w-0 flex-1 truncate text-left text-sm font-medium text-foreground">
                  {activeWorkspaceName}
                </span>
              )}
            </div>
            {isOpen && (
              <span className="flex shrink-0 flex-col text-muted-foreground">
                <ChevronUp className="size-3" />
                <ChevronDown className="-mt-1 size-3" />
              </span>
            )}
          </Button>
        }
      />

      <DropdownMenuContent
        className="w-[min(18rem,calc(100vw-1rem))]"
        align="start"
        side={isOpen ? "bottom" : "right"}
        sideOffset={8}
        alignOffset={isOpen ? -4 : 0}
      >
        {!workspaceView ? (
          <>
            <DropdownMenuItem
              render={
                <Link
                  href="/agents"
                  className="cursor-pointer"
                  onClick={() => useSidebar.getState().closeOnMobile()}
                />
              }
            >
              <LayoutGrid className="size-4" />
              All agents
            </DropdownMenuItem>
            <DropdownMenuSeparator />
          </>
        ) : null}

        <div className="px-2 py-1.5">
          <p className="text-xs font-normal text-muted-foreground">Workspaces</p>
        </div>

        {workspaces.map((workspace) => (
          <DropdownMenuItem
            key={workspace.id}
            onClick={() => handleSwitch(workspace.id)}
            className="flex cursor-pointer items-center justify-between"
          >
            <div className="flex min-w-0 items-center gap-2">
              <FolderKanban className="size-4 shrink-0" />
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{workspace.name}</p>
                <p className="truncate text-xs capitalize text-muted-foreground">
                  {workspace.type?.toLowerCase().replace(/_/g, " ")}
                </p>
              </div>
            </div>
            {workspace.id === activeWorkspaceId ? (
              <Check className="size-4 shrink-0 text-primary" />
            ) : null}
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem
          className="cursor-pointer"
          onClick={() => window.dispatchEvent(new CustomEvent("open-create-workspace"))}
        >
          <Plus className="size-4" />
          Create workspace
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
