"use client";

import { useMemo } from "react";

import { IntegrationCategorySection } from "@/features/integrations/components/integration-category-section";
import { PendingActionsCard } from "@/features/integrations/components/pending-actions-card";
import { useToast } from "@/components/ui/use-toast";
import { useConnectIntegration, useIntegrations } from "@/hooks/query";
import { INTEGRATION_CATEGORIES } from "@/features/integrations/categories";
import { getAllIntegrations, getIntegrationsByCategory } from "@/features/integrations/registry";

export function WidgetIntegrationsPage() {
  const { toast } = useToast();
  const integrationsQuery = useIntegrations();
  const connectMutation = useConnectIntegration();

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
    if (connected) {
      window.location.assign(`/integrations/${slug}`);
      return;
    }
    try {
      await connectMutation.mutateAsync({ slug });
      return;
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
      <PendingActionsCard />
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
