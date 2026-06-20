import type { Metadata } from "next";
import Link from "next/link";

import { buttonVariants } from "@/components/ui/button-variants";
import { AgentSettingsForm } from "@/features/widget/components/agent-settings-form";
import { ensureWorkspaceWidget } from "@/features/widget/server/widget-service";
import { requireDashboardContext } from "@/lib/auth/dashboard-context";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Agent",
};

export default async function AgentPage() {
  const { db, workspace } = await requireDashboardContext();
  const widget = await ensureWorkspaceWidget(db, workspace.id);

  return (
    <main className="mx-auto max-w-4xl space-y-6 p-4 md:p-6 lg:p-8">
      <section className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm text-muted-foreground">AI assistant</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">Agent</h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            Configure the widget agent behavior and escalation triggers for human handoff.
          </p>
        </div>
        <Link
          href="/dashboard/widget"
          className={cn(buttonVariants({ variant: "outline" }), "w-fit")}
        >
          Open full widget settings
        </Link>
      </section>

      <section className="rounded-3xl border p-6">
        <h2 className="text-base font-semibold">Active model</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {widget.modelProvider === "GOOGLE" ? "Gemini" : "OpenAI"} · {widget.modelName}
        </p>
      </section>

      <AgentSettingsForm
        instructions={widget.instructions}
        escalationKeywords={widget.escalationKeywords}
      />
    </main>
  );
}
