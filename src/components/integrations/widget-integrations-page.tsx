"use client";

import { useMemo } from "react";

import { IntegrationCategorySection } from "@/components/integrations/integration-category-section";
import { useToast } from "@/components/ui/use-toast";
import { useConnectIntegration, useDisconnectIntegration, useIntegrations } from "@/hooks/query";
import { INTEGRATION_CATEGORIES } from "@/lib/integrations/categories";
import { getAllIntegrations, getIntegrationsByCategory } from "@/lib/integrations/registry";

export function WidgetIntegrationsPage() {
  const { toast } = useToast();
  const integrationsQuery = useIntegrations();
  const connectMutation = useConnectIntegration();
  const disconnectMutation = useDisconnectIntegration();

  const connectedSlugs = useMemo(() => {
    const entries = integrationsQuery.data?.workspaceIntegrations ?? [];
    return new Set(
      entries
        .filter((entry) => entry.status === "CONNECTED")
        .map((entry) => entry.slug ?? entry.integrationSlug)
        .filter(Boolean) as string[],
    );
  }, [integrationsQuery.data?.workspaceIntegrations]);

  async function handleSelect(slug: string) {
    const connected = connectedSlugs.has(slug);
    try {
      if (connected) {
        await disconnectMutation.mutateAsync(slug);
        toast({ title: "Disconnected", description: `${slug} disconnected.` });
      } else {
        await connectMutation.mutateAsync({ slug });
        toast({ title: "Connected", description: `${slug} connected.` });
      }
      await integrationsQuery.refetch();
    } catch (error) {
      toast({
        title: "Integration error",
        description: error instanceof Error ? error.message : "Action failed.",
        variant: "destructive",
      });
    }
  }

  if (integrationsQuery.isLoading) {
    return <p className="text-sm text-muted-foreground">Loading integrations…</p>;
  }

  return (
    <div className="space-y-10 pb-10">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Integrations</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Connect Gmail, Google Calendar, and Slack for agent actions and notifications.
        </p>
      </div>

      {INTEGRATION_CATEGORIES.map((category) => {
        const integrations = getIntegrationsByCategory(category.id);
        if (integrations.length === 0) return null;

        return (
          <IntegrationCategorySection
            key={category.id}
            category={category}
            integrations={integrations}
            isConnected={(slug) => connectedSlugs.has(slug)}
            onSelect={handleSelect}
            initialVisible={6}
          />
        );
      })}

      {getAllIntegrations().length === 0 ? (
        <p className="text-sm text-muted-foreground">No integrations configured.</p>
      ) : null}
    </div>
  );
}
