"use client";

import { useActionState, useState } from "react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { InviteMemberForm } from "@/features/workspaces/components/invite-member-form";
import {
  removeMemberAction,
  updateMemberRoleAction,
  type MemberActionState,
} from "@/features/workspaces/actions-members";

type WorkspaceRole = "OWNER" | "MEMBER";

export type WorkspaceSettingsMember = {
  membershipId: string;
  name: string;
  email: string;
  image: string | null;
  role: WorkspaceRole;
};

export type PendingWorkspaceInvite = {
  id: string;
  email: string;
  role: WorkspaceRole;
  expiresAt: string;
};

const initialActionState: MemberActionState = {};

function getInitials(name: string, email: string) {
  const label = name.trim() || email;
  return label
    .split(/[\s@._-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");
}

function RoleControl({
  member,
  canManage,
  isCurrentUser,
}: {
  member: WorkspaceSettingsMember;
  canManage: boolean;
  isCurrentUser: boolean;
}) {
  const [state, formAction, pending] = useActionState(updateMemberRoleAction, initialActionState);
  const [role, setRole] = useState<WorkspaceRole>(member.role);
  if (!canManage || isCurrentUser) {
    return <Badge variant="outline">{member.role === "OWNER" ? "Owner" : "Member"}</Badge>;
  }

  return (
    <form action={formAction} className="flex flex-wrap items-center justify-end gap-2">
      <input type="hidden" name="membershipId" value={member.membershipId} />
      <label className="sr-only" htmlFor={`role-${member.membershipId}`}>
        {`Role for ${member.name || member.email}`}
      </label>
      <select
        id={`role-${member.membershipId}`}
        name="role"
        value={role}
        onChange={(event) => setRole(event.target.value as WorkspaceRole)}
        disabled={pending}
        className="h-9 rounded-lg border border-border bg-background px-2.5 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30 disabled:opacity-60"
      >
        <option value="MEMBER">Member</option>
        <option value="OWNER">Owner</option>
      </select>
      <Button type="submit" size="sm" variant="outline" disabled={pending || role === member.role}>
        {pending ? "Saving…" : "Save"}
      </Button>
      {state.error ? (
        <span role="alert" className="w-full text-right text-xs text-destructive">
          {state.error}
        </span>
      ) : state.savedAt ? (
        <output className="w-full text-right text-xs text-muted-foreground">Role updated.</output>
      ) : null}
    </form>
  );
}

function RemoveMemberControl({ member }: { member: WorkspaceSettingsMember }) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(removeMemberAction, initialActionState);

  return (
    <>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="text-muted-foreground hover:text-destructive"
        aria-label={`Remove ${member.name || member.email} from workspace`}
        disabled={Boolean(state.savedAt)}
        onClick={() => setOpen(true)}
      >
        Remove
      </Button>
      <AlertDialog open={open && !state.savedAt} onOpenChange={setOpen}>
        <AlertDialogContent>
          <form action={formAction} className="space-y-5">
            <input type="hidden" name="membershipId" value={member.membershipId} />
            <AlertDialogHeader>
              <AlertDialogTitle>Remove {member.name || member.email}?</AlertDialogTitle>
              <AlertDialogDescription>
                They will lose access to this workspace. Existing conversations and workspace data
                will stay available to the team.
              </AlertDialogDescription>
            </AlertDialogHeader>
            {state.error ? (
              <p role="alert" className="text-sm text-destructive">
                {state.error}
              </p>
            ) : null}
            <AlertDialogFooter>
              <AlertDialogCancel disabled={pending}>Cancel</AlertDialogCancel>
              <Button type="submit" variant="destructive" disabled={pending}>
                {pending ? "Removing…" : "Remove teammate"}
              </Button>
            </AlertDialogFooter>
          </form>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function formatExpiry(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Expiry unavailable";
  return `Expires ${new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(date)}`;
}

export function TeamSettings({
  canManage,
  currentMembershipId,
  members,
  pendingInvites,
}: {
  canManage: boolean;
  currentMembershipId: string;
  members: WorkspaceSettingsMember[];
  pendingInvites: PendingWorkspaceInvite[];
}) {
  return (
    <div className="space-y-5">
      <section
        aria-labelledby="team-people-heading"
        className="overflow-hidden rounded-xl border bg-card"
      >
        <header className="flex items-start justify-between gap-3 border-b px-4 py-4 sm:px-5">
          <div>
            <h3 id="team-people-heading" className="text-sm font-semibold">
              People
            </h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Workspace members and the access level they have.
            </p>
          </div>
          <Badge variant="secondary">{members.length}</Badge>
        </header>
        <ul className="divide-y divide-border/70">
          {members.map((member) => {
            const isCurrentUser = member.membershipId === currentMembershipId;

            return (
              <li
                key={member.membershipId}
                className="flex flex-col gap-3 px-4 py-3.5 sm:flex-row sm:items-center sm:px-5"
              >
                <div className="flex min-w-0 flex-1 items-center gap-3">
                  <Avatar className="size-9 shrink-0">
                    <AvatarImage src={member.image ?? undefined} alt="" />
                    <AvatarFallback className="text-xs">
                      {getInitials(member.name, member.email)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">
                      {member.name || member.email}
                      {isCurrentUser ? (
                        <span className="ml-1.5 text-xs font-normal text-muted-foreground">
                          You
                        </span>
                      ) : null}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">{member.email}</p>
                  </div>
                </div>
                <div className="flex items-center justify-between gap-3 pl-12 sm:pl-0">
                  <RoleControl
                    key={`${member.membershipId}:${member.role}`}
                    member={member}
                    canManage={canManage}
                    isCurrentUser={isCurrentUser}
                  />
                  {canManage && !isCurrentUser ? <RemoveMemberControl member={member} /> : null}
                </div>
              </li>
            );
          })}
        </ul>
      </section>

      {canManage ? (
        <>
          <InviteMemberForm canManage />
          <section
            aria-labelledby="pending-invites-heading"
            className="overflow-hidden rounded-xl border bg-card"
          >
            <header className="border-b px-4 py-4 sm:px-5">
              <h3 id="pending-invites-heading" className="text-sm font-semibold">
                Pending invites
              </h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Links can only be accepted by the invited email and expire after seven days.
              </p>
            </header>
            {pendingInvites.length ? (
              <ul className="divide-y divide-border/70">
                {pendingInvites.map((invite) => (
                  <li
                    key={invite.id}
                    className="flex flex-col gap-1.5 px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between sm:px-5"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{invite.email}</p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {formatExpiry(invite.expiresAt)}
                      </p>
                    </div>
                    <Badge variant="outline">{invite.role === "OWNER" ? "Owner" : "Member"}</Badge>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="px-4 py-5 text-sm text-muted-foreground sm:px-5">
                No one is waiting to join. New invites will appear here until accepted or expired.
              </p>
            )}
          </section>
        </>
      ) : (
        <p className="rounded-lg border border-border/70 bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
          A workspace owner can invite teammates, update roles, and remove access.
        </p>
      )}
    </div>
  );
}
