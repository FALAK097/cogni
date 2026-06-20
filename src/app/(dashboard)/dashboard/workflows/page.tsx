import type { Metadata } from "next";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { retryWorkflowRunAction } from "@/features/workflows/actions";
import { listWorkflowRuns } from "@/features/workflows/queries";
import { requireDashboardContext } from "@/lib/auth/dashboard-context";

export const metadata: Metadata = {
  title: "Workflows",
};

function statusVariant(status: string) {
  if (status === "COMPLETED") return "default" as const;
  if (status === "RUNNING") return "secondary" as const;
  if (status === "FAILED") return "outline" as const;
  return "destructive" as const;
}

export default async function WorkflowsPage() {
  const { workspace } = await requireDashboardContext();
  const runs = await listWorkflowRuns(workspace.id);

  return (
    <main className="mx-auto max-w-7xl space-y-6 p-4 md:p-6 lg:p-8">
      <section>
        <p className="text-sm text-muted-foreground">Reliability</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">Workflows</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          Track durable workflow runs, retries, and dead-letter failures for this workspace.
        </p>
      </section>

      <section className="rounded-3xl border">
        <header className="border-b px-4 py-3">
          <h2 className="font-semibold">Recent runs</h2>
        </header>
        {runs.length === 0 ? (
          <p className="px-4 py-8 text-sm text-muted-foreground">No workflow runs yet.</p>
        ) : (
          <div className="divide-y">
            {runs.map((run) => (
              <article
                key={run.id}
                className="grid gap-3 px-4 py-4 sm:grid-cols-[minmax(0,1fr)_8rem_10rem_auto]"
              >
                <div className="min-w-0">
                  <p className="truncate font-medium">{run.name}</p>
                  <p className="font-mono text-xs text-muted-foreground">{run.id}</p>
                  {run.errorMessage ? (
                    <p className="mt-1 text-xs text-destructive">{run.errorMessage}</p>
                  ) : null}
                </div>
                <Badge variant={statusVariant(run.status)}>{run.status}</Badge>
                <p className="text-xs text-muted-foreground">
                  Attempts {run.attempts}/{run.maxAttempts}
                  <br />
                  {run.startedAt.toLocaleString()}
                </p>
                {run.status === "FAILED" || run.status === "DEAD" ? (
                  <form action={retryWorkflowRunAction}>
                    <input type="hidden" name="workflowRunId" value={run.id} />
                    <Button type="submit" size="sm" variant="outline">
                      Retry
                    </Button>
                  </form>
                ) : (
                  <span />
                )}
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
