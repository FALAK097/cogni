import type { Metadata } from "next";

import { WidgetStudio } from "@/features/widget/components/widget-studio";
import {
  createVisitorSession,
  ensureWorkspaceWidget,
  toWidgetSettings,
} from "@/features/widget/server/widget-service";
import { requireDashboardContext } from "@/lib/auth/dashboard-context";
import { env } from "@/lib/env/server";

export const metadata: Metadata = {
  title: "Widget",
};

export default async function WidgetPage() {
  const { db, workspace } = await requireDashboardContext();
  const widget = await ensureWorkspaceWidget(db, workspace.id);
  const previewSession = await createVisitorSession(db, widget.id, "dashboard-preview");

  return (
    <main className="mx-auto max-w-[96rem] space-y-7 p-4 md:p-6 lg:p-8">
      <section className="border-b pb-7">
        <p className="text-sm text-muted-foreground">Website widget</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">Design, test, and install</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
          Configure the assistant your visitors will see, restrict where it can run, and test the
          conversation before adding one script to your site.
        </p>
      </section>
      <WidgetStudio
        initialSettings={toWidgetSettings(widget)}
        previewSessionToken={previewSession.token}
        appUrl={(env.BETTER_AUTH_URL ?? "http://localhost:3000").replace(/\/$/, "")}
      />
    </main>
  );
}
