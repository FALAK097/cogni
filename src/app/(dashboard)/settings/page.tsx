import { ContentLayout } from "@/components/app-nav/content-layout";
import { WidgetIntegrationsPage } from "@/features/integrations/components/widget-integrations-page";
import { requireDashboardContext } from "@/lib/auth/dashboard-context";
import { getWorkspaceMembers } from "@/features/workspaces/queries";
import { listWorkspaceInvites } from "@/features/workspaces/server/members";
import {
  TeamSettings,
  type PendingWorkspaceInvite,
  type WorkspaceSettingsMember,
} from "@/features/workspaces/components/team-settings";
import { SITE_NAME } from "@/lib/constants";
import { APP_PAGES } from "@/features/navigation/app-routes";

export const metadata = {
  title: `${APP_PAGES.settings.label} | ${SITE_NAME}`,
  description: APP_PAGES.settings.description,
};

export default async function SettingsPage() {
  const { db, membership, workspace } = await requireDashboardContext();
  const canManage = membership.role === "OWNER";
  const [members, pendingInvites] = await Promise.all([
    getWorkspaceMembers(workspace.id),
    canManage ? listWorkspaceInvites(db, workspace.id) : Promise.resolve([]),
  ]);
  const teamMembers: WorkspaceSettingsMember[] = members.map((member) => ({
    membershipId: member.id,
    name: member.user.name,
    email: member.user.email,
    image: member.user.image,
    role: member.role === "OWNER" ? "OWNER" : "MEMBER",
  }));
  const teamInvites: PendingWorkspaceInvite[] = pendingInvites.map((invite) => ({
    id: invite.id,
    email: invite.email,
    role: invite.role === "OWNER" ? "OWNER" : "MEMBER",
    expiresAt: invite.expiresAt,
  }));

  return (
    <ContentLayout>
      <div className="container mx-auto space-y-8 pb-10">
        <header>
          <h1 className="text-xl font-semibold tracking-tight">{APP_PAGES.settings.label}</h1>
          <p className="mt-2 text-sm text-muted-foreground">{APP_PAGES.settings.description}</p>
        </header>
        <section aria-labelledby="team-heading" className="space-y-4">
          <div>
            <h2 id="team-heading" className="text-lg font-semibold tracking-tight">
              Team
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Manage who can access this workspace and what they can change.
            </p>
          </div>
          <TeamSettings
            canManage={canManage}
            currentMembershipId={membership.id}
            members={teamMembers}
            pendingInvites={teamInvites}
          />
        </section>
        <section aria-labelledby="connections-heading">
          <h2 id="connections-heading" className="mb-4 text-lg font-semibold tracking-tight">
            Connections
          </h2>
          <WidgetIntegrationsPage canManage={canManage} />
        </section>
      </div>
    </ContentLayout>
  );
}
