"use client";

import { useMemo } from "react";

import { IntegrationCategorySection } from "@/features/integrations/components/integration-category-section";
import { PendingActionsCard } from "@/features/integrations/components/pending-actions-card";
import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { useAuthMe, useConnectIntegration, useIntegrations } from "@/hooks/query";
import { INTEGRATION_CATEGORIES } from "@/features/integrations/categories";
import { getAllIntegrations, getIntegrationsByCategory } from "@/features/integrations/registry";
import { Info } from "@/components/icons";
import { EmptyState } from "@/components/ui/empty-state";
import { IntegrationsPageSkeleton } from "@/features/integrations/components/integrations-page-skeleton";

export function WidgetIntegrationsPage({ canManage }: { canManage: boolean }) {
  const { toast } = useToast();
  const authMeQuery = useAuthMe();
  const activeWorkspaceId = authMeQuery.data?.session?.activeWorkspaceId;
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

  if (authMeQuery.isLoading || integrationsQuery.isLoading) {
    return <IntegrationsPageSkeleton />;
  }

  if (authMeQuery.isError && !authMeQuery.data) {
    return (
      <EmptyState
        mode="error"
        title="Workspace details could not be loaded"
        titleAs="p"
        description="Retry to confirm the active workspace before managing connections."
      >
        <Button
          variant="outline"
          onClick={() => void authMeQuery.refetch()}
          disabled={authMeQuery.isFetching}
        >
          {authMeQuery.isFetching ? "Retrying…" : "Try again"}
        </Button>
      </EmptyState>
    );
  }

  if (!activeWorkspaceId) {
    return (
      <EmptyState
        mode="pane"
        title="No active workspace is selected"
        titleAs="p"
        description="Reload Settings after selecting a workspace to manage its connections."
        role="alert"
      >
        <Button variant="outline" onClick={() => window.location.reload()}>
          Reload Settings
        </Button>
      </EmptyState>
    );
  }

  if (integrationsQuery.isError && !integrationsQuery.data) {
    return (
      <EmptyState
        mode="error"
        title="Connections could not be loaded"
        titleAs="p"
        description="Try again to see which tools are connected."
      >
        <Button
          variant="outline"
          onClick={() => void integrationsQuery.refetch()}
          disabled={integrationsQuery.isFetching}
        >
          {integrationsQuery.isFetching ? "Retrying…" : "Try again"}
        </Button>
      </EmptyState>
    );
  }

  return (
    <div className="space-y-10 pb-10">
      {integrationsQuery.isError ? (
        <div
          role="alert"
          className="flex flex-wrap items-center justify-between gap-3 py-3 text-sm text-muted-foreground"
        >
          <p>Connections couldn’t refresh. Showing the last loaded connections.</p>
          <Button
            size="sm"
            variant="outline"
            onClick={() => void integrationsQuery.refetch()}
            disabled={integrationsQuery.isFetching}
          >
            {integrationsQuery.isFetching ? "Retrying…" : "Try again"}
          </Button>
        </div>
      ) : null}
      <PendingActionsCard canManage={canManage} />
      {!canManage ? (
        <output className="flex items-start gap-2 py-3 text-sm text-muted-foreground">
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
        <EmptyState
          mode="pane"
          title="No connections are available yet"
          titleAs="p"
          description="Connected services will appear here."
        />
      ) : null}
    </div>
  );
}
