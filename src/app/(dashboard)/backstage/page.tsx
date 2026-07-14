import { BackstageChat } from "@/components/backstage/backstage-chat";
import { requireDashboardContext } from "@/lib/auth/dashboard-context";
import { ensureWorkspaceWidget } from "@/features/widget/server/widget-service";

export const metadata = {
  title: "Backstage",
  description: "Your AI command center",
};

export const dynamic = "force-dynamic";

export default async function BackstagePage() {
  const { db, session, workspace } = await requireDashboardContext();
  const widget = await ensureWorkspaceWidget(db, workspace.id);

  return <BackstageChat userName={session.user.name} agentName={widget.displayName} />;
}
