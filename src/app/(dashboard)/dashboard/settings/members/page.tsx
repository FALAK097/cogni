import type { Metadata } from "next";

import { Button } from "@/components/ui/button";
import {
  removeMemberAction,
  transferOwnershipAction,
  updateMemberRoleAction,
} from "@/features/workspaces/actions-members";
import { InviteMemberForm } from "@/features/workspaces/components/invite-member-form";
import { getWorkspaceMembers } from "@/features/workspaces/queries";
import { listWorkspaceInvites } from "@/features/workspaces/server/members";
import { requireDashboardContext } from "@/lib/auth/dashboard-context";

export const metadata: Metadata = {
  title: "Members",
};

export default async function WorkspaceMembersPage() {
  const { db, membership, session, workspace } = await requireDashboardContext();
  const [members, invites] = await Promise.all([
    getWorkspaceMembers(workspace.id),
    listWorkspaceInvites(db, workspace.id),
  ]);
  const canManage = membership.role === "OWNER";

  return (
    <main className="mx-auto max-w-5xl space-y-8 p-4 md:p-6 lg:p-8">
      <section>
        <p className="text-sm text-muted-foreground">Workspace</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">Members</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Invite teammates, manage roles, and remove members from {workspace.name}.
        </p>
      </section>

      <InviteMemberForm canManage={canManage} />

      <section className="rounded-3xl border p-6">
        <h2 className="text-lg font-semibold">Team members</h2>
        <div className="mt-4 divide-y">
          {members.map((member) => {
            const isCurrentUser = member.userId === session.user.id;

            return (
              <article
                key={member.id}
                className="grid gap-4 py-4 sm:grid-cols-[minmax(0,1fr)_13rem_auto] sm:items-center"
              >
                <div className="min-w-0">
                  <p className="truncate font-medium">{member.user.name}</p>
                  <p className="truncate text-sm text-muted-foreground">{member.user.email}</p>
                </div>

                <form action={updateMemberRoleAction} className="flex items-center gap-2">
                  <input type="hidden" name="membershipId" value={member.id} />
                  <select
                    name="role"
                    defaultValue={member.role}
                    disabled={!canManage || isCurrentUser}
                    className="h-9 w-full rounded-xl border bg-background px-3 text-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/30 disabled:opacity-60"
                  >
                    <option value="MEMBER">Member</option>
                    <option value="OWNER">Owner</option>
                  </select>
                  <Button
                    type="submit"
                    variant="outline"
                    size="sm"
                    disabled={!canManage || isCurrentUser}
                  >
                    Save
                  </Button>
                </form>

                <form action={removeMemberAction} className="sm:justify-self-end">
                  <input type="hidden" name="membershipId" value={member.id} />
                  <Button
                    type="submit"
                    variant="destructive"
                    size="sm"
                    disabled={!canManage || isCurrentUser}
                  >
                    Remove
                  </Button>
                </form>

                {canManage && !isCurrentUser && member.role !== "OWNER" ? (
                  <form action={transferOwnershipAction} className="sm:col-span-3">
                    <input type="hidden" name="membershipId" value={member.id} />
                    <Button type="submit" variant="outline" size="sm">
                      Transfer ownership
                    </Button>
                  </form>
                ) : null}
              </article>
            );
          })}
        </div>
      </section>

      <section className="rounded-3xl border p-6">
        <h2 className="text-lg font-semibold">Pending invites</h2>
        {invites.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">No pending invites.</p>
        ) : (
          <div className="mt-4 divide-y">
            {invites.map((invite) => (
              <article
                key={invite.id}
                className="grid gap-2 py-4 sm:grid-cols-[minmax(0,1fr)_7rem_auto] sm:items-center"
              >
                <div className="min-w-0">
                  <p className="truncate font-medium">{invite.email}</p>
                  <p className="text-xs text-muted-foreground">
                    Expires {invite.expiresAt.toLocaleDateString()}
                  </p>
                </div>
                <p className="text-sm text-muted-foreground">{invite.role}</p>
                <a
                  href={`/invite/${invite.token}`}
                  className="text-sm text-primary underline-offset-2 hover:underline sm:justify-self-end"
                >
                  Open invite link
                </a>
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
