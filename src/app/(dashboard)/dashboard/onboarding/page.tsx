import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { Metadata } from "next";

import { Button } from "@/components/ui/button";
import { switchWorkspaceAction } from "@/features/workspaces/actions-members";
import { listUserWorkspaces, requireDashboardContext } from "@/lib/auth/dashboard-context";

export const metadata: Metadata = {
  title: "Onboarding",
};

function onboardingCookieOptions() {
  return {
    httpOnly: true,
    path: "/",
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 365,
  };
}

export default async function OnboardingPage() {
  const { session, workspace } = await requireDashboardContext();
  const workspaces = await listUserWorkspaces(session.user.id);
  const cookieStore = await cookies();
  const activeWorkspaceId = cookieStore.get("active_workspace_id")?.value;

  if (workspaces.length === 1 && cookieStore.get("onboarding_complete")?.value === "1") {
    redirect("/dashboard");
  }

  async function completeOnboardingAction() {
    "use server";
    const cookieStore = await cookies();
    cookieStore.set("onboarding_complete", "1", onboardingCookieOptions());
    redirect("/dashboard/widget");
  }

  return (
    <main className="mx-auto max-w-3xl space-y-8 p-4 md:p-6 lg:p-8">
      <section>
        <p className="text-sm text-muted-foreground">Welcome</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">Set up your workspace</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Complete these steps to launch the widget on your site and start handling conversations.
        </p>
      </section>

      {workspaces.length > 1 && !activeWorkspaceId ? (
        <section className="space-y-4 rounded-3xl border p-6">
          <h2 className="text-lg font-semibold">Choose a workspace</h2>
          <p className="text-sm text-muted-foreground">
            You belong to multiple workspaces. Pick the one you want to work in now.
          </p>
          <div className="space-y-3">
            {workspaces.map((entry) => (
              <form key={entry.workspaceId} action={switchWorkspaceAction} className="flex gap-3">
                <input type="hidden" name="workspaceId" value={entry.workspaceId} />
                <input type="hidden" name="returnTo" value="/dashboard/onboarding" />
                <Button type="submit" variant="outline" className="w-full justify-start">
                  {entry.workspace.name}
                  <span className="ml-auto text-xs text-muted-foreground">{entry.role}</span>
                </Button>
              </form>
            ))}
          </div>
        </section>
      ) : (
        <section className="space-y-4 rounded-3xl border p-6">
          <h2 className="text-lg font-semibold">{workspace.name}</h2>
          <ol className="space-y-3 text-sm text-muted-foreground">
            <li>1. Configure branding and the welcome message in Widget Studio.</li>
            <li>2. Upload knowledge sources so AI answers from your docs.</li>
            <li>3. Copy the one-line install script and embed it on your site.</li>
          </ol>
          <div className="flex flex-wrap gap-3">
            <Button render={<Link href="/dashboard/widget" />}>Open Widget Studio</Button>
            <Button variant="outline" render={<Link href="/dashboard/knowledge" />}>
              Add knowledge
            </Button>
            <form action={completeOnboardingAction}>
              <Button type="submit" variant="secondary">
                Mark setup complete
              </Button>
            </form>
          </div>
        </section>
      )}
    </main>
  );
}
