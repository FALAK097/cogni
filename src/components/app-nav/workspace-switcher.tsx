"use client";

import { Check, ChevronDown, ChevronUp, FolderKanban } from "@/components/icons";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useWorkspaces } from "@/hooks/query";
import { useAuthMe, useSwitchWorkspace } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";

type WorkspaceSwitcherProps = {
  isOpen?: boolean;
};

// TODO: Re-enable workspace creation (add button + dialog) when multi-workspace is ready.

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
      window.location.assign("/dashboard");
    } catch (error) {
      console.error("Failed to switch workspace:", error);
    }
  };

  if (loading || workspaces.length === 0) {
    return null;
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            variant="ghost"
            data-testid="workspace-switcher-trigger"
            className={cn(
              "w-full justify-between mx-0 h-10 font-normal hover:bg-muted/50",
              isOpen ? "px-2.5" : "justify-center px-0",
            )}
            title={!isOpen ? activeWorkspaceName : undefined}
          >
            <div className={cn("flex items-center min-w-0 gap-2", isOpen && "flex-1")}>
              <FolderKanban className="flex-shrink-0 w-4 h-4 text-muted-foreground" />
              {isOpen && (
                <span className="text-sm font-medium truncate flex-1 min-w-0 text-left">
                  {activeWorkspaceName}
                </span>
              )}
            </div>
            {isOpen && (
              <span className="flex flex-col text-muted-foreground">
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
        <div className="px-2 py-1.5">
          <p className="text-xs font-normal text-muted-foreground">Workspaces</p>
        </div>

        {workspaces.map((workspace) => (
          <DropdownMenuItem
            key={workspace.id}
            onClick={() => handleSwitch(workspace.id)}
            className="flex items-center justify-between cursor-pointer"
          >
            <div className="flex min-w-0 items-center gap-2">
              <FolderKanban className="flex-shrink-0 w-4 h-4" />
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{workspace.name}</p>
                <p className="truncate text-xs capitalize text-muted-foreground">
                  {workspace.type?.toLowerCase().replace(/_/g, " ")}
                </p>
              </div>
            </div>
            {workspace.id === activeWorkspaceId && (
              <Check className="flex-shrink-0 w-4 h-4 text-primary" />
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
