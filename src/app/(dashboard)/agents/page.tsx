import { AgentsGrid } from "@/components/agents/agents-grid";
import { Button } from "@/components/ui/button";
import { Plus } from "@/components/icons";
import { startAgentSetupAction } from "@/features/onboarding/actions";
import { requireDashboardContext } from "@/lib/auth/dashboard-context";
import { getWebsiteFaviconUrl } from "@/lib/brand-icons";

export const metadata = {
  title: "Agents",
  description: "Manage your AI agents",
};

export const dynamic = "force-dynamic";

export default async function AgentsPage() {
  const { db, workspace } = await requireDashboardContext();
  const widget = await db.query.widget.findFirst({
    where: (fields, { eq }) => eq(fields.workspaceId, workspace.id),
  });

  const agents = widget
    ? [
        {
          id: widget.id,
          name: widget.displayName,
          updatedAt: String(widget.updatedAt),
          primaryColor: widget.primaryColor,
          faviconUrl: getWebsiteFaviconUrl(widget.authorizedDomains),
        },
      ]
    : [];

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-6 py-8 sm:px-10">
      <div className="mb-8 flex items-center justify-between gap-4">
        <h1 className="text-3xl font-semibold tracking-tight text-foreground">Agents</h1>
        {agents.length > 0 ? (
          <form action={startAgentSetupAction}>
            <Button type="submit" className="gap-2">
              <Plus className="size-4" />
              New AI agent
            </Button>
          </form>
        ) : null}
      </div>

      <AgentsGrid agents={agents} />

      {agents.length === 0 ? (
        <div className="mt-8 rounded-xl border border-dashed border-border bg-muted/20 p-10 text-center">
          <p className="text-sm text-muted-foreground">
            No agents yet. Complete setup to create your first agent.
          </p>
          <form action={startAgentSetupAction}>
            <Button type="submit" className="mt-4">
              Start setup
            </Button>
          </form>
        </div>
      ) : null}
    </div>
  );
}
