import { ContentLayout } from "@/components/app-nav/content-layout";
import { SITE_NAME } from "@/lib/constants";
import { requireDashboardContext } from "@/lib/auth/dashboard-context";

export const metadata = {
  title: `Usage | ${SITE_NAME}`,
  description: "Workspace usage and credits",
};

export default async function AgentsUsagePage() {
  await requireDashboardContext();

  return (
    <ContentLayout>
      <div className="mx-auto w-full max-w-3xl">
        <div className="mb-8">
          <h1 className="text-3xl font-semibold tracking-tight text-foreground">Usage</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Track credits and monthly consumption for your workspace.
          </p>
        </div>

        <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-foreground">Credits</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Resets monthly on your billing date.
              </p>
            </div>
            <p className="text-2xl font-semibold text-foreground">
              0 <span className="text-base font-normal text-muted-foreground">/ 50</span>
            </p>
          </div>
        </div>

        <div className="mt-6 rounded-2xl border border-dashed border-border bg-muted/20 p-8 text-center">
          <p className="text-sm text-muted-foreground">
            Detailed usage breakdowns for conversations, playground runs, and knowledge indexing
            will appear here.
          </p>
        </div>
      </div>
    </ContentLayout>
  );
}
