import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";

import {
  COMPOSIO_TOOLKITS,
  createComposioClient,
  getComposioProviderBySlug,
} from "@/features/integrations/server/composio-connections";
import { requireDashboardContext } from "@/lib/auth/dashboard-context";
import { canManageWorkspace } from "@/lib/auth/permissions";
import { integration as integrationTable } from "@/lib/db/schema";

export async function GET(request: Request) {
  const { db, workspace, membership } = await requireDashboardContext();
  const url = new URL(request.url);
  const slug = url.searchParams.get("slug") ?? "";
  const destination = new URL("/settings", url.origin);
  if (!canManageWorkspace(membership.role)) {
    destination.searchParams.set("integration", "owner-required");
    return NextResponse.redirect(destination);
  }
  const provider = getComposioProviderBySlug(slug);

  if (!provider) {
    destination.searchParams.set("integration", "unsupported");
    return NextResponse.redirect(destination);
  }

  const record = await db.query.integration.findFirst({
    where: (fields, { and, eq }) =>
      and(eq(fields.workspaceId, workspace.id), eq(fields.provider, provider)),
  });
  if (!record?.connectedAccountId) {
    destination.searchParams.set("integration", "missing");
    return NextResponse.redirect(destination);
  }

  try {
    const account = await createComposioClient().connectedAccounts.get(record.connectedAccountId, {
      signal: AbortSignal.timeout(10_000),
    });
    const isValid =
      account.status === "ACTIVE" && account.toolkit.slug === COMPOSIO_TOOLKITS[provider];
    await db
      .update(integrationTable)
      .set({
        status: isValid ? "CONNECTED" : "ERROR",
        externalAccountId: account.id,
        lastHealthCheckAt: new Date().toISOString(),
        lastError: isValid ? null : `Composio connection status is ${account.status}.`,
        updatedAt: new Date().toISOString(),
      })
      .where(
        and(
          eq(integrationTable.workspaceId, workspace.id),
          eq(integrationTable.provider, provider),
        ),
      );
    destination.searchParams.set("integration", isValid ? "connected" : "failed");
  } catch (error) {
    const message = error instanceof Error ? error.message : "Connection verification failed.";
    await db
      .update(integrationTable)
      .set({ status: "ERROR", lastError: message, updatedAt: new Date().toISOString() })
      .where(
        and(
          eq(integrationTable.workspaceId, workspace.id),
          eq(integrationTable.provider, provider),
        ),
      );
    destination.searchParams.set("integration", "failed");
  }

  return NextResponse.redirect(destination);
}
