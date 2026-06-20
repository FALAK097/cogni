"use client";

import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import { inviteMemberAction, type MemberActionState } from "@/features/workspaces/actions-members";

const initialState: MemberActionState = {};

export function InviteMemberForm({ canManage }: { canManage: boolean }) {
  const [state, formAction, pending] = useActionState(inviteMemberAction, initialState);

  return (
    <form action={formAction} className="space-y-4 rounded-3xl border p-6">
      <h2 className="text-lg font-semibold">Invite member</h2>
      <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_10rem_auto] sm:items-end">
        <label className="grid gap-2 text-sm">
          Email
          <input
            type="email"
            name="email"
            required
            disabled={!canManage || pending}
            placeholder="teammate@company.com"
            className="h-10 rounded-xl border bg-background px-3 text-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/30 disabled:opacity-60"
          />
        </label>
        <label className="grid gap-2 text-sm">
          Role
          <select
            name="role"
            defaultValue="MEMBER"
            disabled={!canManage || pending}
            className="h-10 rounded-xl border bg-background px-3 text-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/30 disabled:opacity-60"
          >
            <option value="MEMBER">Member</option>
            <option value="OWNER">Owner</option>
          </select>
        </label>
        <Button type="submit" disabled={!canManage || pending} className="h-10">
          {pending ? "Inviting…" : "Send invite"}
        </Button>
      </div>
      {!canManage ? (
        <p className="text-sm text-muted-foreground">Only workspace owners can invite members.</p>
      ) : null}
      {state.error ? (
        <p role="alert" className="text-sm text-destructive">
          {state.error}
        </p>
      ) : null}
      {state.savedAt ? (
        <p className="text-sm text-muted-foreground">
          Invite saved. Share the invite link with the user.
        </p>
      ) : null}
    </form>
  );
}
