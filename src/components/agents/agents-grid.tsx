"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { formatDistanceToNow } from "date-fns";

import { MoreHorizontal, Pencil, Trash2 } from "@/components/icons";
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
import { Input } from "@/components/ui/input";
import {
  deleteWidgetAgentAction,
  renameWidgetAgentAction,
  type ManageWidgetAgentActionState,
} from "@/features/widget/actions";
import { enterAgentAction } from "@/features/widget/enter-agent-action";

type AgentSummary = {
  id: string;
  name: string;
  updatedAt: string;
  primaryColor: string;
  faviconUrl: string | null;
};

type AgentsGridProps = {
  agents: AgentSummary[];
};

const initialActionState: ManageWidgetAgentActionState = {};

function RenameAgentDialog({
  agent,
  open,
  onOpenChange,
}: {
  agent: AgentSummary;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const [state, formAction, isPending] = useActionState(
    renameWidgetAgentAction,
    initialActionState,
  );

  useEffect(() => {
    if (!state.savedAt) return;
    onOpenChange(false);
    router.refresh();
  }, [onOpenChange, router, state.savedAt]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md rounded-3xl">
        <DialogHeader>
          <DialogTitle>Edit agent name</DialogTitle>
          <DialogDescription>
            Update how this agent appears across your workspace.
          </DialogDescription>
        </DialogHeader>

        <form action={formAction} className="space-y-4">
          <input type="hidden" name="widgetId" value={agent.id} />
          <div className="space-y-2">
            <label
              htmlFor={`agent-name-${agent.id}`}
              className="text-sm font-medium text-foreground"
            >
              Agent name
            </label>
            <Input
              id={`agent-name-${agent.id}`}
              name="displayName"
              defaultValue={agent.name}
              placeholder="Support Agent"
              required
            />
          </div>

          {state.error ? <p className="text-sm text-destructive">{state.error}</p> : null}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function DeleteAgentDialog({
  agent,
  open,
  onOpenChange,
}: {
  agent: AgentSummary;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const [state, formAction, isPending] = useActionState(
    deleteWidgetAgentAction,
    initialActionState,
  );

  useEffect(() => {
    if (!state.savedAt) return;
    onOpenChange(false);
    router.refresh();
  }, [onOpenChange, router, state.savedAt]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md rounded-3xl">
        <DialogHeader>
          <DialogTitle>Delete agent</DialogTitle>
          <DialogDescription>
            This will remove <span className="font-medium text-foreground">{agent.name}</span> from
            this workspace.
          </DialogDescription>
        </DialogHeader>

        <form action={formAction} className="space-y-4">
          <input type="hidden" name="widgetId" value={agent.id} />

          <div className="rounded-2xl border border-destructive/20 bg-destructive/5 p-4 text-sm text-muted-foreground">
            This action cannot be undone.
          </div>

          {state.error ? <p className="text-sm text-destructive">{state.error}</p> : null}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="destructive" disabled={isPending}>
              {isPending ? "Deleting..." : "Delete agent"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function AgentCard({ agent }: { agent: AgentSummary }) {
  const [renameOpen, setRenameOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  return (
    <>
      <div className="group relative overflow-hidden rounded-xl border border-border bg-card shadow-sm transition-all hover:border-primary/30 hover:shadow-md">
        <form action={enterAgentAction}>
          <input type="hidden" name="widgetId" value={agent.id} />
          <button type="submit" aria-label={`Open ${agent.name}`} className="w-full text-left">
            <div
              className="flex h-36 items-center justify-center bg-gradient-to-br from-primary/20 to-primary/5"
              style={{ backgroundColor: `${agent.primaryColor}14` }}
            >
              <div
                className="flex h-24 w-40 flex-col overflow-hidden rounded-lg border border-border/50 bg-background shadow-sm"
                style={{ borderTopColor: agent.primaryColor, borderTopWidth: 3 }}
              >
                <div className="flex flex-1 items-center justify-center p-3">
                  {agent.faviconUrl ? (
                    <span className="flex size-12 items-center justify-center rounded-xl border border-border/70 bg-white p-2 shadow-xs">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={agent.faviconUrl}
                        alt=""
                        width={32}
                        height={32}
                        loading="lazy"
                        className="h-full w-full object-contain"
                      />
                    </span>
                  ) : (
                    <div className="flex size-12 items-center justify-center rounded-xl border border-border/70 bg-white text-sm font-semibold text-muted-foreground shadow-xs">
                      {agent.name.charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>
                <div className="border-t border-border/50 px-3 py-2">
                  <div className="h-2 w-16 rounded bg-muted" />
                </div>
              </div>
            </div>
            <div className="flex items-start gap-2 p-4 pr-12">
              {agent.faviconUrl ? (
                <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg border border-border/70 bg-white p-1.5 shadow-xs">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={agent.faviconUrl}
                    alt=""
                    width={20}
                    height={20}
                    loading="lazy"
                    className="h-full w-full object-contain"
                  />
                </span>
              ) : null}
              <div className="min-w-0">
                <p className="truncate font-semibold text-foreground">{agent.name}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Last trained {formatDistanceToNow(new Date(agent.updatedAt), { addSuffix: true })}
                </p>
              </div>
            </div>
          </button>
        </form>

        <div className="absolute right-3 bottom-3 z-10">
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  className="size-8 rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
                  aria-label={`Open ${agent.name} menu`}
                >
                  <MoreHorizontal className="size-4" />
                </Button>
              }
            />
            <DropdownMenuContent align="end" className="w-44">
              <DropdownMenuItem
                onClick={() => {
                  setRenameOpen(true);
                }}
              >
                <Pencil className="size-4" />
                Edit name
              </DropdownMenuItem>
              <DropdownMenuItem
                variant="destructive"
                onClick={() => {
                  setDeleteOpen(true);
                }}
              >
                <Trash2 className="size-4" />
                Delete agent
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <RenameAgentDialog agent={agent} open={renameOpen} onOpenChange={setRenameOpen} />
      <DeleteAgentDialog agent={agent} open={deleteOpen} onOpenChange={setDeleteOpen} />
    </>
  );
}

export function AgentsGrid({ agents }: AgentsGridProps) {
  if (agents.length === 0) return null;

  return (
    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {agents.map((agent) => (
        <AgentCard key={agent.id} agent={agent} />
      ))}
    </div>
  );
}
