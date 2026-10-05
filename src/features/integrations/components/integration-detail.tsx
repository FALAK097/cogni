"use client";

import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { z } from "zod";

import { Badge } from "@/components/ui/badge";
import { AlertCircle, Info } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
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
import { getIntegrationBySlug } from "@/features/integrations/registry";
import { integrationDetailResponseSchema } from "@/features/integrations/schemas";
import { queryKeys } from "@/lib/query-keys";

async function loadIntegration(slug: string) {
  const response = await fetch(`/api/dashboard/integrations/${slug}`);
  const body = (await response.json().catch(() => null)) as unknown;
  if (!response.ok) {
    const error = z.object({ error: z.string() }).safeParse(body);
    throw new Error(error.success ? error.data.error : "Could not load integration.");
  }
  return integrationDetailResponseSchema.parse(body);
}

export function IntegrationDetail({ slug, canManage }: { slug: string; canManage: boolean }) {
  const router = useRouter();
  const { toast } = useToast();
  const disconnect = useDisconnectIntegration();
  const [search, setSearch] = useState("");
  const manifest = getIntegrationBySlug(slug);
  const query = useQuery({
    queryKey: queryKeys.integrations.detail(slug),
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

  if (query.isLoading) return <IntegrationDetailSkeleton />;
  if (!query.data) {
    return (
      <div
        role="alert"
        className="flex flex-col items-start gap-4 rounded-2xl border border-border/70 bg-card p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6"
      >
        <div>
          <h1 className="font-semibold">Connection details unavailable</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            We couldn’t load this connection. Check your connection and try again.
          </p>
        </div>
        <Button variant="outline" onClick={() => void query.refetch()} disabled={query.isFetching}>
          {query.isFetching ? "Trying again…" : "Try again"}
        </Button>
      </div>
    );
  }
  const detail = query.data.integration;

  return (
    <div className="space-y-6">
      {query.isError ? (
        <output className="flex flex-col items-start gap-3 rounded-xl border border-border/70 bg-muted/30 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-muted-foreground">
            Couldn’t refresh this connection. Showing the last loaded details.
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => void query.refetch()}
            disabled={query.isFetching}
          >
            {query.isFetching ? "Trying again…" : "Try again"}
          </Button>
        </output>
      ) : null}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Button variant="link" className="h-auto p-0" onClick={() => router.push("/settings")}>
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
            {detail.inboundWebhookUrl ? (
              <div className="space-y-1 pt-2">
                <p className="font-medium">Inbound webhook URL</p>
                <p className="break-all rounded-lg bg-muted p-3 font-mono text-xs">
                  {detail.inboundWebhookUrl}
                </p>
                <p className="text-xs text-muted-foreground">
                  Treat this URL as a secret and configure it in the provider console.
                </p>
              </div>
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
                    <p
                      className={
                        action.status === "UNKNOWN" || action.status === "NOT_SENT"
                          ? "mt-1 text-xs text-muted-foreground"
                          : "mt-1 text-xs text-destructive"
                      }
                    >
                      {action.errorMessage}
                    </p>
                  ) : null}
                </div>
                <Badge
                  variant={action.status === "FAILED" ? "destructive" : "outline"}
                  className={
                    action.status === "UNKNOWN"
                      ? "border-amber-500/25 bg-amber-500/10 text-amber-800 dark:text-amber-300"
                      : action.status === "NOT_SENT"
                        ? "text-muted-foreground"
                        : undefined
                  }
                >
                  {action.status === "UNKNOWN" ? <AlertCircle aria-hidden="true" /> : null}
                  {action.status === "NOT_SENT" ? <Info aria-hidden="true" /> : null}
                  {action.status === "NOT_SENT" ? "Not sent" : action.status.toLowerCase()}
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
          {!canManage ? (
            <p className="text-sm text-muted-foreground">Only workspace owners can disconnect.</p>
          ) : null}
          <AlertDialog>
            <AlertDialogTrigger render={<Button variant="destructive" disabled={!canManage} />}>
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
                        router.push("/settings");
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

export function IntegrationDetailSkeleton() {
  return (
    <output aria-busy="true" aria-label="Loading connection details" className="block space-y-6">
      <div aria-hidden="true" className="flex items-start justify-between gap-4">
        <div className="space-y-3">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-7 w-48 max-w-[65vw]" />
          <Skeleton className="h-4 w-44 max-w-[65vw]" />
        </div>
        <Skeleton className="h-6 w-24 rounded-full" />
      </div>
      <div aria-hidden="true" className="grid gap-4 lg:grid-cols-2">
        {Array.from({ length: 2 }).map((_, index) => (
          <div key={index} className="rounded-2xl border border-border/60 p-5">
            <Skeleton className="h-5 w-36" />
            <div className="mt-5 space-y-3">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-2/3" />
              <Skeleton className="h-4 w-1/2" />
            </div>
          </div>
        ))}
      </div>
      <div aria-hidden="true" className="rounded-2xl border border-border/60 p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <Skeleton className="h-5 w-24" />
          <Skeleton className="h-9 w-full rounded-lg sm:w-56" />
        </div>
        <div className="mt-5 space-y-2">
          {Array.from({ length: 3 }).map((_, index) => (
            <Skeleton key={index} className="h-16 w-full rounded-lg" />
          ))}
        </div>
      </div>
      <div aria-hidden="true" className="rounded-2xl border border-border/60 p-5">
        <Skeleton className="h-5 w-44" />
        <Skeleton className="mt-4 h-9 w-28 rounded-lg" />
      </div>
    </output>
  );
}
