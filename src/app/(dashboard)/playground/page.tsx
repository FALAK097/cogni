import { PlaygroundPage as PlaygroundScreen } from "@/components/playground/playground-page";
import { SITE_NAME } from "@/lib/constants";
import { requireDashboardContext } from "@/lib/auth/dashboard-context";

export const metadata = {
  title: `Playground | ${SITE_NAME}`,
  description: "Test your AI agent in a sandbox environment",
};

export default async function PlaygroundPage() {
  const { workspace } = await requireDashboardContext();

  return <PlaygroundScreen workspaceId={workspace.id} />;
}
