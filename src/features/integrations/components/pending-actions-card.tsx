"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle, Info } from "@/components/icons";
import { useToast } from "@/components/ui/use-toast";
import { queryKeys } from "@/lib/query-keys";

type PendingApproval = {
  id: string;
  actionType: string;
  riskLevel: string;
  summary: string;
  status: string;
  actionStatus: string | null;
  actionErrorMessage: string | null;
  expiresAt: string;
  token: string;
};

async function readResponse<T>(response: Response): Promise<T> {
  const body = (await response.json().catch(() => ({}))) as T & { error?: string };
  if (!response.ok) throw new Error(body.error ?? "Request failed.");
  return body;
}

export function PendingActionsCard() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const query = useQuery<{ approvals: PendingApproval[] }>({
    queryKey: queryKeys.integrations.approvals(),
    queryFn: async () => readResponse(await fetch("/api/dashboard/actions")),
    refetchInterval: 15_000,
  });
  const decision = useMutation({
    mutationFn: async ({
      approval,
      value,
    }: {
      approval: PendingApproval;
      value: "APPROVED" | "REJECTED";
    }) =>
      readResponse(
        await fetch(`/api/dashboard/actions/${approval.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token: approval.token, decision: value }),
        }),
      ),
    onSuccess: async (_result, variables) => {
      toast({
        title: variables.value === "APPROVED" ? "Action completed" : "Action rejected",
        description: variables.approval.summary,
      });
      await queryClient.invalidateQueries({ queryKey: queryKeys.integrations.approvals() });
    },
    onError: (error) => {
      toast({
        title: "Could not process action",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
    },
  });

  if (query.isLoading || !query.data || query.data.approvals.length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Actions awaiting approval</CardTitle>
        <p className="text-sm text-muted-foreground">
          Review external writes requested by the widget or an automated workflow.
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        {query.data.approvals.map((approval) => {
          const isPending = decision.isPending && decision.variables.approval.id === approval.id;
          const outcomeUnknown = approval.actionStatus === "UNKNOWN";
          const notSent = approval.actionStatus === "NOT_SENT";
          return (
            <div
              key={approval.id}
              className="flex flex-col gap-3 rounded-xl border p-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="min-w-0 space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-medium">{approval.summary}</p>
                  <Badge variant={approval.riskLevel === "HIGH" ? "destructive" : "secondary"}>
                    {approval.riskLevel.toLowerCase()} risk
                  </Badge>
                  {outcomeUnknown ? (
                    <Badge
                      variant="outline"
                      className="border-amber-500/25 bg-amber-500/10 text-amber-800 dark:text-amber-300"
                    >
                      <AlertCircle aria-hidden="true" />
                      Outcome unknown
                    </Badge>
                  ) : null}
                  {notSent ? (
                    <Badge variant="outline">
                      <Info aria-hidden="true" />
                      Not sent
                    </Badge>
                  ) : null}
                </div>
                <p className="text-xs text-muted-foreground">
                  {approval.actionType} · expires {new Date(approval.expiresAt).toLocaleString()}
                </p>
                {outcomeUnknown || notSent ? (
                  <p
                    className={
                      outcomeUnknown
                        ? "max-w-2xl text-sm text-amber-900 dark:text-amber-200"
                        : "max-w-2xl text-sm text-muted-foreground"
                    }
                  >
                    {outcomeUnknown
                      ? (approval.actionErrorMessage ?? "Check the provider before trying again.")
                      : `This action was not sent. ${approval.actionErrorMessage ?? "You can safely retry it."}`}
                  </p>
                ) : null}
              </div>
              {outcomeUnknown ? null : (
                <div className="flex shrink-0 gap-2">
                  {approval.status === "PENDING" ? (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={isPending}
                      onClick={() => decision.mutate({ approval, value: "REJECTED" })}
                    >
                      Reject
                    </Button>
                  ) : null}
                  <Button
                    type="button"
                    size="sm"
                    disabled={isPending}
                    onClick={() => decision.mutate({ approval, value: "APPROVED" })}
                  >
                    {isPending
                      ? "Running…"
                      : approval.status === "APPROVED"
                        ? "Retry action"
                        : "Approve and run"}
                  </Button>
                </div>
              )}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
