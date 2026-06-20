import { headers } from "next/headers";
import { notFound } from "next/navigation";

import { WidgetShell } from "@/features/widget/components/widget-shell";
import {
  createVisitorSession,
  getPublicWidget,
  isHostnameAuthorized,
  toWidgetSettings,
} from "@/features/widget/server/widget-service";
import { requireDashboardContext } from "@/lib/auth/dashboard-context";
import { getDb } from "@/lib/db/client";

function referrerHostname(referrer: string | null) {
  if (!referrer) return null;

  try {
    return new URL(referrer).hostname;
  } catch {
    return null;
  }
}

function referrerOrigin(referrer: string | null) {
  if (!referrer) return null;

  try {
    return new URL(referrer).origin;
  } catch {
    return null;
  }
}

export default async function EmbedPage({
  params,
  searchParams,
}: {
  params: Promise<{ publicKey: string }>;
  searchParams: Promise<{ preview?: string }>;
}) {
  const [{ publicKey }, query, requestHeaders] = await Promise.all([
    params,
    searchParams,
    headers(),
  ]);
  const db = getDb();
  const widget = await getPublicWidget(db, publicKey);

  if (!widget || !widget.isEnabled) {
    notFound();
  }

  let hostname = referrerHostname(requestHeaders.get("referer"));
  let parentOrigin = referrerOrigin(requestHeaders.get("referer"));

  if (query.preview === "1") {
    const { workspace } = await requireDashboardContext();
    if (workspace.id !== widget.workspaceId) {
      notFound();
    }
    hostname = "dashboard-preview";
    parentOrigin = new URL(requestHeaders.get("referer") ?? "http://localhost:3000").origin;
  } else if (!hostname || !isHostnameAuthorized(hostname, widget.authorizedDomains)) {
    return (
      <main className="flex min-h-svh items-center justify-center p-6 text-center text-sm text-muted-foreground">
        This domain is not authorized to use this widget.
      </main>
    );
  }

  const visitorSession = await createVisitorSession(db, widget.id, hostname);

  if (!parentOrigin) {
    notFound();
  }

  return (
    <main className="flex h-svh w-full items-end justify-end overflow-hidden bg-transparent">
      <WidgetShell
        settings={toWidgetSettings(widget)}
        sessionToken={visitorSession.token}
        embedded
        parentOrigin={parentOrigin}
      />
    </main>
  );
}
