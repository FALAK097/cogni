import type { Metadata } from "next";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  connectIntegrationAction,
  disconnectIntegrationAction,
} from "@/features/integrations/actions";
import { integrationTools } from "@/features/integrations/server/tool-registry";
import { requireDashboardContext } from "@/lib/auth/dashboard-context";

export const metadata: Metadata = {
  title: "Integrations",
};

const integrationProviders = [
  {
    provider: "GMAIL",
    label: "Gmail",
    description: "Send email replies and follow-up updates from conversations.",
  },
  {
    provider: "GOOGLE_CALENDAR",
    label: "Google Calendar",
    description: "Create and reschedule meetings requested during support chats.",
  },
  {
    provider: "SLACK",
    label: "Slack",
    description: "Post notifications when conversations are escalated or assigned.",
  },
] as const;

export default async function IntegrationsPage() {
  const { db, workspace } = await requireDashboardContext();
  const [integrations, recentActions] = await Promise.all([
    db.integration.findMany({
      where: { workspaceId: workspace.id },
    }),
    db.integrationAction.findMany({
      where: { workspaceId: workspace.id },
      orderBy: { createdAt: "desc" },
      take: 10,
    }),
  ]);

  const integrationByProvider = new Map(
    integrations.map((integration) => [integration.provider, integration]),
  );

  return (
    <main className="mx-auto max-w-7xl space-y-6 p-4 md:p-6 lg:p-8">
      <section>
        <p className="text-sm text-muted-foreground">Connections</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">Integrations</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          Connect external tools to let your team and AI trigger actions from conversations.
        </p>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {integrationProviders.map((item) => {
          const integration = integrationByProvider.get(item.provider);
          const isConnected = integration?.status === "CONNECTED";

          return (
            <article key={item.provider} className="space-y-5 rounded-3xl border p-6">
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-3">
                  <h2 className="text-base font-semibold">{item.label}</h2>
                  <Badge variant={isConnected ? "default" : "outline"}>
                    {isConnected ? "CONNECTED" : "DISCONNECTED"}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">{item.description}</p>
              </div>
              {isConnected ? (
                <form action={disconnectIntegrationAction}>
                  <input type="hidden" name="provider" value={item.provider} />
                  <Button type="submit" variant="outline">
                    Disconnect
                  </Button>
                </form>
              ) : (
                <form action={connectIntegrationAction}>
                  <input type="hidden" name="provider" value={item.provider} />
                  <Button type="submit">Connect</Button>
                </form>
              )}
            </article>
          );
        })}
      </section>

      <section className="rounded-3xl border p-6">
        <h2 className="text-lg font-semibold">Available tools</h2>
        <div className="mt-4 divide-y">
          {integrationTools.map((tool) => (
            <article
              key={tool.actionType}
              className="grid gap-2 py-4 sm:grid-cols-[minmax(0,1fr)_8rem]"
            >
              <div>
                <p className="font-medium">{tool.label}</p>
                <p className="text-sm text-muted-foreground">{tool.description}</p>
              </div>
              <p className="text-xs text-muted-foreground">{tool.actionType}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="rounded-3xl border p-6">
        <h2 className="text-lg font-semibold">Recent actions</h2>
        {recentActions.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">No integration actions yet.</p>
        ) : (
          <div className="mt-4 divide-y">
            {recentActions.map((action) => (
              <article
                key={action.id}
                className="grid gap-2 py-4 sm:grid-cols-[minmax(0,1fr)_8rem_8rem]"
              >
                <div>
                  <p className="font-medium">
                    {action.provider} · {action.actionType}
                  </p>
                  <p className="font-mono text-xs text-muted-foreground">{action.id}</p>
                </div>
                <Badge variant="outline">{action.status}</Badge>
                <p className="text-xs text-muted-foreground">{action.createdAt.toLocaleString()}</p>
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
