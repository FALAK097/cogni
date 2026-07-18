"use client";

import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/components/ui/use-toast";
import { useDisconnectIntegration } from "@/hooks/query";
import { getIntegrationBySlug } from "@/lib/integrations/registry";

type IntegrationDetailResponse = {
  integration: {
    id: string;
    slug: string;
    provider: string;
    status: string;
    providerStatus: string | null;
    toolkit: string;
    connectedAt: string;
    lastHealthCheckAt: string | null;
    lastError: string | null;
    capabilities: {
      actionType: string;
      label: string;
      riskLevel: string;
      requiresApproval: boolean;
    }[];
  };
  actions: {
    id: string;
    actionType: string;
    status: string;
    errorMessage: string | null;
    createdAt: string;
    updatedAt: string;
  }[];
};

async function loadIntegration(slug: string) {
  const response = await fetch(`/api/dashboard/integrations/${slug}`);
  const body = (await response.json().catch(() => ({}))) as IntegrationDetailResponse & {
    error?: string;
  };
  if (!response.ok) throw new Error(body.error ?? "Could not load integration.");
  return body;
}

export function IntegrationDetail({ slug }: { slug: string }) {
  const router = useRouter();
  const { toast } = useToast();
  const disconnect = useDisconnectIntegration();
  const [search, setSearch] = useState("");
  const manifest = getIntegrationBySlug(slug);
  const query = useQuery({
    queryKey: ["integration-detail", slug],
    queryFn: () => loadIntegration(slug),
    refetchInterval: 30_000,
  });
  const actions = useMemo(() => {
    const needle = search.trim().toLowerCase();
    if (!needle) return query.data?.actions ?? [];
    return (query.data?.actions ?? []).filter((action) =>
      [action.actionType, action.status, action.errorMessage ?? ""]
        .join(" ")
        .toLowerCase()
        .includes(needle),
    );
  }, [query.data?.actions, search]);

  if (query.isLoading) return <div className="h-72 animate-pulse rounded-xl border bg-muted/30" />;
  if (query.isError || !query.data) {
    return <p className="text-sm text-destructive">{query.error?.message ?? "Not found."}</p>;
  }
  const detail = query.data.integration;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Button
            variant="link"
            className="h-auto p-0"
            onClick={() => router.push("/integrations")}
          >
            ← All integrations
          </Button>
          <h1 className="mt-3 text-2xl font-semibold">{manifest?.name ?? detail.provider}</h1>
          <p className="text-sm text-muted-foreground">Composio toolkit: {detail.toolkit}</p>
        </div>
        <Badge variant={detail.status === "CONNECTED" ? "secondary" : "destructive"}>
          {detail.status.toLowerCase()}
        </Badge>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Connection health</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p>Provider status: {detail.providerStatus?.toLowerCase() ?? "unavailable"}</p>
            <p>Connected: {new Date(detail.connectedAt).toLocaleString()}</p>
            <p>
              Last checked:{" "}
              {detail.lastHealthCheckAt
                ? new Date(detail.lastHealthCheckAt).toLocaleString()
                : "Just now"}
            </p>
            {detail.lastError ? (
              <p className="rounded-lg bg-destructive/10 p-3 text-destructive">
                {detail.lastError}
              </p>
            ) : null}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Available actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {detail.capabilities.length === 0 ? (
              <p className="text-sm text-muted-foreground">No agent actions are enabled yet.</p>
            ) : (
              detail.capabilities.map((capability) => (
                <div
                  key={capability.actionType}
                  className="flex items-center justify-between gap-3 rounded-lg border p-3 text-sm"
                >
                  <span>{capability.label}</span>
                  <Badge variant="outline">
                    {capability.requiresApproval ? "Approval required" : "Read only"}
                  </Badge>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="text-base">Action log</CardTitle>
            <p className="text-sm text-muted-foreground">The latest 100 audited actions.</p>
          </div>
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search status, action, or error"
            className="sm:max-w-xs"
          />
        </CardHeader>
        <CardContent className="space-y-2">
          {actions.length === 0 ? (
            <p className="text-sm text-muted-foreground">No matching actions.</p>
          ) : (
            actions.map((action) => (
              <div
                key={action.id}
                className="grid gap-1 rounded-lg border p-3 text-sm sm:grid-cols-[1fr_auto]"
              >
                <div>
                  <p className="font-medium">{action.actionType}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(action.createdAt).toLocaleString()}
                  </p>
                  {action.errorMessage ? (
                    <p className="mt-1 text-xs text-destructive">{action.errorMessage}</p>
                  ) : null}
                </div>
                <Badge variant={action.status === "FAILED" ? "destructive" : "outline"}>
                  {action.status.toLowerCase()}
                </Badge>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Card className="border-destructive/30">
        <CardHeader>
          <CardTitle className="text-base">Disconnect integration</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap items-center justify-between gap-4">
          <p className="text-sm text-muted-foreground">
            Stops future actions. Existing audit history is retained.
          </p>
          <AlertDialog>
            <AlertDialogTrigger render={<Button variant="destructive" />}>
              Disconnect
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Disconnect {manifest?.name ?? detail.provider}?</AlertDialogTitle>
                <AlertDialogDescription>
                  The agent will no longer be able to use this integration. Existing conversations
                  and action history remain available.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() =>
                    disconnect.mutate(slug, {
                      onSuccess: () => {
                        toast({ title: "Integration disconnected" });
                        router.push("/integrations");
                      },
                      onError: (error) =>
                        toast({
                          title: "Disconnect failed",
                          description: error.message,
                          variant: "destructive",
                        }),
                    })
                  }
                >
                  Disconnect
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </CardContent>
      </Card>
    </div>
  );
}
