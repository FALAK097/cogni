import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { OnboardingWizard } from "@/components/onboarding/onboarding-wizard";
import { requireAuth, listUserWorkspaces } from "@/lib/auth/dashboard-context";
import { ensureDefaultWorkspace } from "@/lib/auth/provision-workspace";
import { getDb } from "@/lib/db/client";
import { AGENT_SETUP_COOKIE } from "@/features/onboarding/agent-setup-cookie";
import { isOnboardingComplete } from "@/features/onboarding/queries";

export const metadata = {
  title: "Get started",
  description: "Set up your AI agent",
};

export const dynamic = "force-dynamic";

export default async function OnboardingPage() {
  const session = await requireAuth();
  const db = getDb();
  await ensureDefaultWorkspace(db, session.user);

  const cookieStore = await cookies();
  const activeWorkspaceId = cookieStore.get("active_workspace_id")?.value;
  const memberships = await listUserWorkspaces(session.user.id);
  const membership =
    memberships.find((entry) => entry.workspaceId === activeWorkspaceId) ?? memberships[0];
  const workspace = membership?.workspace;

  if (!workspace) {
    redirect("/");
  }

  const widget = await db.query.widget.findFirst({
    where: (fields, { eq }) => eq(fields.workspaceId, workspace.id),
  });
  const completed = await isOnboardingComplete(db, workspace.id);
  const agentSetupPending = cookieStore.get(AGENT_SETUP_COOKIE)?.value === "1";

  if (completed && widget && !agentSetupPending) {
    redirect("/backstage");
  }

  return <OnboardingWizard workspaceName={workspace.name} canExitSetup={agentSetupPending} />;
}
