"use client";

import { useActionState, useRef, useState } from "react";

import { CheckCircle2, Copy, UserPlus } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { inviteMemberAction, type MemberActionState } from "@/features/workspaces/actions-members";

const initialState: MemberActionState = {};

export function InviteMemberForm({ canManage }: { canManage: boolean }) {
  const [state, formAction, pending] = useActionState(inviteMemberAction, initialState);
  const inviteUrl = state.inviteUrl ?? "";
  const [copyResult, setCopyResult] = useState<{ url: string; message: string } | null>(null);
  const inviteLinkRef = useRef<HTMLInputElement>(null);
  const copyMessage = copyResult?.url === inviteUrl ? copyResult.message : "";

  async function copyInviteLink() {
    if (!inviteUrl) return;

    try {
      await navigator.clipboard.writeText(inviteUrl);
      setCopyResult({ url: inviteUrl, message: "Invite link copied." });
    } catch {
      inviteLinkRef.current?.focus();
      inviteLinkRef.current?.select();
      setCopyResult({
        url: inviteUrl,
        message: "The link is selected. Copy it to share the invite.",
      });
    }
  }

  const inviteExpiry = state.inviteExpiresAt
    ? new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(
        new Date(state.inviteExpiresAt),
      )
    : null;

  return (
    <section
      aria-labelledby="invite-member-heading"
      className="rounded-xl border bg-card p-4 sm:p-5"
    >
      <div className="flex items-start gap-3">
        <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <UserPlus className="size-4" aria-hidden="true" />
        </span>
        <div>
          <h3 id="invite-member-heading" className="text-sm font-semibold">
            Invite a teammate
          </h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Create a secure, seven-day invite link for their work email.
          </p>
        </div>
      </div>

      <form
        action={formAction}
        className="mt-4 grid gap-3 sm:grid-cols-[minmax(0,1fr)_9rem_auto] sm:items-end"
      >
        <label htmlFor="invite-email" className="grid min-w-0 gap-1.5 text-sm font-medium">
          Email address
          <Input
            id="invite-email"
            type="email"
            name="email"
            required
            disabled={!canManage || pending}
            placeholder="teammate@company.com"
            autoComplete="email"
            className="h-10 rounded-lg bg-background"
          />
        </label>
        <label htmlFor="invite-role" className="grid gap-1.5 text-sm font-medium">
          Role
          <select
            id="invite-role"
            name="role"
            defaultValue="MEMBER"
            disabled={!canManage || pending}
            className="h-10 rounded-lg border border-border bg-background px-3 text-sm font-normal outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30 disabled:opacity-60"
          >
            <option value="MEMBER">Member</option>
            <option value="OWNER">Owner</option>
          </select>
        </label>
        <Button type="submit" disabled={!canManage || pending} className="h-10 gap-2 rounded-lg">
          <UserPlus className="size-4" aria-hidden="true" />
          {pending ? "Creating link…" : "Create invite"}
        </Button>
      </form>

      {state.error ? (
        <p role="alert" className="mt-3 text-sm text-destructive">
          {state.error}
        </p>
      ) : null}

      {inviteUrl ? (
        <div className="mt-4 rounded-lg border border-border/70 bg-muted/20 p-3">
          <label htmlFor="workspace-invite-link" className="text-xs font-medium text-foreground">
            Invite link for {state.inviteEmail}
          </label>
          <div className="mt-1.5 flex gap-2">
            <Input
              ref={inviteLinkRef}
              id="workspace-invite-link"
              readOnly
              value={inviteUrl}
              onFocus={(event) => event.currentTarget.select()}
              className="h-10 min-w-0 rounded-lg bg-background font-mono text-xs"
            />
            <Button
              type="button"
              variant="outline"
              className="h-10 shrink-0 gap-2 rounded-lg px-3"
              onClick={() => void copyInviteLink()}
            >
              {copyMessage === "Invite link copied." ? (
                <CheckCircle2 className="size-4" aria-hidden="true" />
              ) : (
                <Copy className="size-4" aria-hidden="true" />
              )}
              Copy
            </Button>
          </div>
          <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
            Only someone signed in as {state.inviteEmail} can accept this link
            {inviteExpiry ? ` · expires ${inviteExpiry}` : ""}.
          </p>
          {copyMessage ? (
            <output className="mt-1 block text-xs text-muted-foreground">{copyMessage}</output>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
