"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Check, ChevronDown, ChevronUp, FolderKanban, Loader2 } from "@/components/icons";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { toast } from "@/components/ui/use-toast";
import { useCreateWorkspaceWorkspace, useWorkspaces } from "@/hooks/query";
import { useAuthMe, useSwitchWorkspace } from "@/hooks/use-auth";
import { getPlanLimits, isUnlimited, WORKSPACE_LIMIT_REACHED_MESSAGE } from "@/lib/plan-limits";
import { cn } from "@/lib/utils";

type WorkspaceSwitcherProps = {
  isOpen?: boolean;
};

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

const USAGE_LIMIT_REACHED_TITLE = "Usage Limit Reached";

function getWorkspaceErrorStatus(error: unknown): number | null {
  if (!error || typeof error !== "object") return null;
  const apiError = error as {
    status?: number;
    statusCode?: number;
    response?: { status?: number };
  };
  if (typeof apiError.status === "number") return apiError.status;
  if (typeof apiError.statusCode === "number") return apiError.statusCode;
  if (typeof apiError.response?.status === "number") return apiError.response.status;
  return null;
}

function getWorkspaceErrorMessage(error: unknown): string {
  if (error && typeof error === "object") {
    const apiError = error as { detail?: string; error?: string; message?: string };
    if (typeof apiError.detail === "string" && apiError.detail.length > 0) return apiError.detail;
    if (typeof apiError.error === "string" && apiError.error.length > 0) return apiError.error;
    if (typeof apiError.message === "string" && apiError.message.length > 0)
      return apiError.message;
  }
  return "Failed to create workspace.";
}

function isWorkspaceLimitError(error: unknown, errorMessage: string): boolean {
  return getWorkspaceErrorStatus(error) === 403 || errorMessage === WORKSPACE_LIMIT_REACHED_MESSAGE;
}

const workspaceFormSchema = z.object({
  name: z.string().trim().min(1, "Workspace name is required"),
});

type WorkspaceFormValues = z.infer<typeof workspaceFormSchema>;

export function WorkspaceSwitcher({ isOpen }: WorkspaceSwitcherProps) {
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const authMeQuery = useAuthMe();
  const { data: workspace, isLoading: workspacesLoading } = useWorkspaces();
  const switchWorkspace = useSwitchWorkspace();
  const createWorkspace = useCreateWorkspaceWorkspace();
  const workspaceData = workspace as WorkspaceData | undefined;
  const workspaces = workspaceData?.workspaces ?? [];
  const currentUserId = authMeQuery.data?.session?.user?.id ?? null;
  const activeWorkspaceId = authMeQuery.data?.session?.activeWorkspaceId ?? null;
  const loading = authMeQuery.isLoading || workspacesLoading;
  const creating = createWorkspace.isPending;
  const ownedWorkspaces = currentUserId
    ? workspaces.filter((workspace) => workspace.ownerUserId === currentUserId)
    : [];
  const billingWorkspace =
    ownedWorkspaces.find((workspace) => workspace.isPrimary) ?? ownedWorkspaces[0] ?? null;
  const workspaceLimit = billingWorkspace ? getPlanLimits(billingWorkspace.planType).workspaces : 0;
  const hasReachedWorkspaceLimit =
    billingWorkspace !== null &&
    !isUnlimited(workspaceLimit) &&
    ownedWorkspaces.length >= workspaceLimit;
  const activeWorkspace = workspaces.find((workspace) => workspace.id === activeWorkspaceId);
  const activeWorkspaceName = activeWorkspace?.name || "Select Workspace";

  const form = useForm<WorkspaceFormValues>({
    resolver: zodResolver(workspaceFormSchema),
    defaultValues: { name: "" },
    mode: "onSubmit",
  });

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

  const handleCreateWorkspace = (values: WorkspaceFormValues) => {
    createWorkspace.mutate(
      { name: values.name.trim() },
      {
        onSuccess: async (data) => {
          const result = data as {
            workspace?: { id?: string; name?: string };
            id?: string;
            name?: string;
          };
          const createdWorkspaceId = result.workspace?.id ?? result.id;
          const createdWorkspaceName = result.workspace?.name ?? result.name ?? values.name.trim();

          if (createdWorkspaceId) {
            await switchWorkspace.mutateAsync(createdWorkspaceId);
          }

          toast({
            title: "Workspace created",
            description: `${createdWorkspaceName} is now active.`,
          });
          setCreateDialogOpen(false);
          form.reset();
          window.dispatchEvent(new CustomEvent("workspace-switched"));
          window.location.assign("/dashboard");
        },
        onError: (error) => {
          const errorMessage = getWorkspaceErrorMessage(error);
          const isLimitError = isWorkspaceLimitError(error, errorMessage);
          toast({
            title: isLimitError ? USAGE_LIMIT_REACHED_TITLE : "Error",
            description: errorMessage,
            variant: "destructive",
          });
        },
      },
    );
  };

  const _openCreateDialog = () => {
    if (hasReachedWorkspaceLimit) {
      toast({
        title: USAGE_LIMIT_REACHED_TITLE,
        description: WORKSPACE_LIMIT_REACHED_MESSAGE,
        variant: "destructive",
      });
      return;
    }

    setCreateDialogOpen(true);
  };

  if (loading) {
    return null;
  }

  return (
    <>
      {workspaces.length ===
      0 ? // TODO: Re-enable workspace creation when multi-workspace is ready.
      // <Button
      //   variant="ghost"
      //   className={cn(
      //     "w-full mx-0 h-10 font-normal hover:bg-muted/50",
      //     isOpen ? "justify-start px-2.5" : "justify-center px-0",
      //   )}
      //   onClick={openCreateDialog}
      //   data-testid="workspace-switcher-add"
      //   title={!isOpen ? "Add Workspace" : undefined}
      // >
      //   <Plus className="flex-shrink-0 w-4 h-4 text-muted-foreground" />
      //   {isOpen && <span className="text-sm font-medium">Add Workspace</span>}
      // </Button>
      null : (
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
            <div className="flex items-center justify-between px-2 py-1.5">
              <p className="text-xs font-normal text-muted-foreground">Workspaces</p>
              {/* TODO: Re-enable workspace creation when multi-workspace is ready.
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger
                    render={
                      <button
                        type="button"
                        onClick={openCreateDialog}
                        className="inline-flex size-7 cursor-pointer items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-transparent hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
                        aria-label="Add workspace"
                        data-testid="workspace-switcher-add"
                      />
                    }
                  >
                    <Plus className="size-4" />
                  </TooltipTrigger>
                  <TooltipContent side="top">
                    <p>Add workspace</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
              */}
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
      )}
      <Dialog
        open={createDialogOpen}
        onOpenChange={(open) => {
          setCreateDialogOpen(open);
          if (!open) form.reset();
        }}
      >
        <DialogContent className="max-w-[95vw] sm:max-w-[450px]">
          <DialogHeader>
            <DialogTitle>Create workspace</DialogTitle>
            <DialogDescription>
              Add a workspace for a separate set of leads, agents, calls, and settings.
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleCreateWorkspace)} className="space-y-6">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Workspace name"
                        autoComplete="off"
                        disabled={creating}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button type="submit" disabled={creating}>
                  {creating ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    "Create Workspace"
                  )}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </>
  );
}
