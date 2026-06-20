import type { Metadata } from "next";

import { requireDashboardContext } from "@/lib/auth/dashboard-context";
import { env } from "@/lib/env/server";
import { isCloudflareSearchConfigured } from "@/lib/search/cloudflare-search";
import { isR2Configured } from "@/lib/cloudflare/r2";
import { isVectorizeConfigured } from "@/lib/cloudflare/vectorize";

export const metadata: Metadata = {
  title: "Monitoring",
};

export default async function MonitoringPage() {
  const { db, workspace } = await requireDashboardContext();

  const [failedWorkflows, deadWorkflows, failedDocuments, recentEvents] = await Promise.all([
    db.workflowRun.count({
      where: { workspaceId: workspace.id, status: "FAILED" },
    }),
    db.workflowRun.count({
      where: { workspaceId: workspace.id, status: "DEAD" },
    }),
    db.document.count({
      where: { workspaceId: workspace.id, status: "FAILED" },
    }),
    db.domainEvent.findMany({
      where: { workspaceId: workspace.id },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
  ]);

  const infrastructure = [
    { label: "D1 runtime", ready: env.ENV === "production" && Boolean(env.D1_DATABASE_ID) },
    { label: "R2 storage", ready: isR2Configured() },
    { label: "Vectorize", ready: isVectorizeConfigured() },
    { label: "Cloudflare Search", ready: isCloudflareSearchConfigured() },
    { label: "OpenAI embeddings", ready: Boolean(env.OPENAI_API_KEY) },
  ];

  return (
    <main className="mx-auto max-w-7xl space-y-6 p-4 md:p-6 lg:p-8">
      <section>
        <p className="text-sm text-muted-foreground">Operations</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">Monitoring</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          Workspace health, infrastructure configuration, and recent domain events.
        </p>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <article className="rounded-3xl border p-5">
          <p className="text-xs text-muted-foreground">Failed workflows</p>
          <p className="mt-2 font-mono text-3xl font-semibold">{failedWorkflows}</p>
        </article>
        <article className="rounded-3xl border p-5">
          <p className="text-xs text-muted-foreground">Dead-letter workflows</p>
          <p className="mt-2 font-mono text-3xl font-semibold">{deadWorkflows}</p>
        </article>
        <article className="rounded-3xl border p-5">
          <p className="text-xs text-muted-foreground">Failed documents</p>
          <p className="mt-2 font-mono text-3xl font-semibold">{failedDocuments}</p>
        </article>
        <article className="rounded-3xl border p-5">
          <p className="text-xs text-muted-foreground">Environment</p>
          <p className="mt-2 font-mono text-3xl font-semibold">{env.ENV}</p>
        </article>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <article className="rounded-3xl border p-6">
          <h2 className="text-lg font-semibold">Infrastructure readiness</h2>
          <ul className="mt-4 space-y-2 text-sm">
            {infrastructure.map((item) => (
              <li key={item.label} className="flex items-center justify-between gap-3">
                <span>{item.label}</span>
                <span className={item.ready ? "text-emerald-600" : "text-muted-foreground"}>
                  {item.ready ? "Ready" : "Not configured"}
                </span>
              </li>
            ))}
          </ul>
        </article>

        <article className="rounded-3xl border p-6">
          <h2 className="text-lg font-semibold">Recent domain events</h2>
          {recentEvents.length === 0 ? (
            <p className="mt-4 text-sm text-muted-foreground">No events recorded yet.</p>
          ) : (
            <ul className="mt-4 divide-y">
              {recentEvents.map((event) => (
                <li key={event.id} className="py-3 text-sm">
                  <p className="font-medium">{event.type}</p>
                  <p className="font-mono text-xs text-muted-foreground">
                    {event.entityId ?? "—"} · {event.createdAt.toLocaleString()}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </article>
      </section>
    </main>
  );
}
