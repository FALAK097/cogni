"use client";

import { useMemo } from "react";

import { IntegrationCategorySection } from "@/features/integrations/components/integration-category-section";
import { PendingActionsCard } from "@/features/integrations/components/pending-actions-card";
import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { useConnectIntegration, useIntegrations } from "@/hooks/query";
import { INTEGRATION_CATEGORIES } from "@/features/integrations/categories";
import { getAllIntegrations, getIntegrationsByCategory } from "@/features/integrations/registry";
import { Info } from "@/components/icons";
import { IntegrationsPageSkeleton } from "@/features/integrations/components/integrations-page-skeleton";

export function WidgetIntegrationsPage({ canManage }: { canManage: boolean }) {
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

  const existingSlugs = useMemo(
    () =>
      new Set(
        (integrationsQuery.data?.workspaceIntegrations ?? [])
          .filter((entry) => entry.status !== "DISCONNECTED")
          .map((entry) => entry.slug ?? entry.integrationSlug)
          .filter(Boolean) as string[],
      ),
    [integrationsQuery.data?.workspaceIntegrations],
  );

  async function handleSelect(slug: string) {
    const connected = connectedSlugs.has(slug) || (!canManage && existingSlugs.has(slug));
    if (connected) {
      window.location.assign(`/settings/connections/${encodeURIComponent(slug)}`);
      return;
    }
    if (!canManage) return;
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
    return <IntegrationsPageSkeleton />;
  }

  if (integrationsQuery.isError && !integrationsQuery.data) {
    return (
      <div role="alert" className="rounded-xl border border-border bg-card p-6">
        <p className="font-medium">Connections could not be loaded</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Try again to see which tools are connected.
        </p>
        <Button className="mt-4" variant="outline" onClick={() => void integrationsQuery.refetch()}>
          Try again
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-10 pb-10">
      <PendingActionsCard canManage={canManage} />
      {!canManage ? (
        <output className="flex items-start gap-2 rounded-lg border border-border/70 bg-muted/30 px-3 py-2.5 text-sm text-muted-foreground">
          <Info className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          <p>
            You can view connections and approvals. A workspace owner manages connections and makes
            approval decisions.
          </p>
        </output>
      ) : null}
      {INTEGRATION_CATEGORIES.map((category) => {
        const integrations = getIntegrationsByCategory(category.id);
        if (integrations.length === 0) return null;

        return (
          <IntegrationCategorySection
            key={category.id}
            category={category}
            integrations={integrations}
            canManage={canManage}
            isConnected={(slug) => connectedSlugs.has(slug)}
            hasRecord={(slug) => existingSlugs.has(slug)}
            onSelect={handleSelect}
            initialVisible={6}
          />
        );
      })}

      {getAllIntegrations().length === 0 ? (
        <p className="rounded-xl border border-dashed border-border/70 px-5 py-8 text-center text-sm text-muted-foreground">
          No connections are available yet.
        </p>
      ) : null}
    </div>
  );
}
