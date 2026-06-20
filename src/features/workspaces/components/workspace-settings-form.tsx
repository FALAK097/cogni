"use client";

import { useActionState } from "react";
import { FloppyDiskIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";

import { Button } from "@/components/ui/button";
import {
  updateWorkspaceSettingsAction,
  type WorkspaceActionState,
} from "@/features/workspaces/actions";

const initialState: WorkspaceActionState = {};

export function WorkspaceSettingsForm({
  workspace,
  canManage,
}: {
  workspace: {
    name: string;
    timezone: string;
    logo: string | null;
    brandColor: string;
  };
  canManage: boolean;
}) {
  const [state, formAction, pending] = useActionState(updateWorkspaceSettingsAction, initialState);

  return (
    <form action={formAction} className="space-y-5 rounded-3xl border p-6">
      <label className="grid gap-2 text-sm font-medium">
        Workspace name
        <input
          name="name"
          defaultValue={workspace.name}
          disabled={!canManage}
          required
          className="h-10 w-full rounded-xl border bg-background px-3 text-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/30 disabled:opacity-60"
        />
      </label>
      <label className="grid gap-2 text-sm font-medium">
        Logo URL
        <input
          name="logo"
          type="url"
          defaultValue={workspace.logo ?? ""}
          disabled={!canManage}
          placeholder="https://…"
          className="h-10 w-full rounded-xl border bg-background px-3 text-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/30 disabled:opacity-60"
        />
      </label>
      <label className="grid gap-2 text-sm font-medium">
        Brand color
        <input
          name="brandColor"
          defaultValue={workspace.brandColor}
          disabled={!canManage}
          required
          className="h-10 w-full rounded-xl border bg-background px-3 font-mono text-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/30 disabled:opacity-60"
        />
      </label>
      <label className="grid gap-2 text-sm font-medium">
        Timezone
        <input
          name="timezone"
          defaultValue={workspace.timezone}
          disabled={!canManage}
          required
          placeholder="UTC"
          className="h-10 w-full rounded-xl border bg-background px-3 text-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/30 disabled:opacity-60"
        />
      </label>
      {!canManage ? (
        <p className="text-sm text-muted-foreground">Only workspace owners can change settings.</p>
      ) : null}
      {state.error ? (
        <p role="alert" className="text-sm text-destructive">
          {state.error}
        </p>
      ) : null}
      {state.savedAt ? <p className="text-sm text-muted-foreground">Settings saved.</p> : null}
      {canManage ? (
        <Button type="submit" disabled={pending}>
          <HugeiconsIcon icon={FloppyDiskIcon} />
          {pending ? "Saving…" : "Save settings"}
        </Button>
      ) : null}
    </form>
  );
}
