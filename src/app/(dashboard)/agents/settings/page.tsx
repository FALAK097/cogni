import { ContentLayout } from "@/components/app-nav/content-layout";
import { WorkspaceSettingsForm } from "@/features/workspaces/components/workspace-settings-form";
import { SITE_NAME } from "@/lib/constants";
import { requireDashboardContext } from "@/lib/auth/dashboard-context";

export const metadata = {
  title: `Workspace settings | ${SITE_NAME}`,
  description: "Manage workspace settings",
};

export default async function AgentsSettingsPage() {
  const { membership, workspace } = await requireDashboardContext();

  return (
    <ContentLayout>
      <div className="mx-auto w-full max-w-2xl">
        <div className="mb-8">
          <h1 className="text-3xl font-semibold tracking-tight text-foreground">
            Workspace settings
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Update your workspace name, branding, and timezone.
          </p>
        </div>

        <WorkspaceSettingsForm
          workspace={{
            name: workspace.name,
            timezone: workspace.timezone,
            logo: workspace.logo,
            brandColor: workspace.brandColor,
          }}
          canManage={membership.role === "OWNER"}
        />
      </div>
    </ContentLayout>
  );
}
