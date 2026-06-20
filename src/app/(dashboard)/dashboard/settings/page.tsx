import type { Metadata } from "next";

import { ProfileForm } from "@/features/auth/components/profile-form";
import { WorkspaceSettingsForm } from "@/features/workspaces/components/workspace-settings-form";
import { requireDashboardContext } from "@/lib/auth/dashboard-context";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Settings",
};

export default async function SettingsPage() {
  const { membership, session, workspace } = await requireDashboardContext();

  return (
    <main className="mx-auto max-w-3xl space-y-8 p-4 md:p-6 lg:p-8">
      <section>
        <p className="text-sm text-muted-foreground">Workspace</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">Settings</h1>
      </section>

      <WorkspaceSettingsForm workspace={workspace} canManage={membership.role === "OWNER"} />

      {membership.role === "OWNER" ? (
        <section className="rounded-3xl border p-6">
          <h2 className="text-lg font-semibold">Team</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Invite teammates and manage workspace roles.
          </p>
          <Link
            href="/dashboard/settings/members"
            className="mt-4 inline-flex text-sm font-medium text-primary hover:underline"
          >
            Manage members
          </Link>
        </section>
      ) : null}

      <section className="rounded-3xl border p-6">
        <h2 className="text-lg font-semibold">Your profile</h2>
        <dl className="mt-4 space-y-3 text-sm">
          <div>
            <dt className="text-muted-foreground">Email</dt>
            <dd className="font-medium">{session.user.email}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Role</dt>
            <dd className="font-medium">{membership.role}</dd>
          </div>
        </dl>
        <ProfileForm name={session.user.name} />
      </section>
    </main>
  );
}
