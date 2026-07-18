import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { eq, and } from "drizzle-orm";
import {
  COMPOSIO_PROVIDER_SLUGS,
  COMPOSIO_TOOLKITS,
  createComposioClient,
  getComposioProviderBySlug,
  getOrCreateAuthConfig,
  type ComposioProvider,
} from "@/features/integrations/server/composio-connections";
import { requireDashboardContext } from "@/lib/auth/dashboard-context";
import { integration as integrationTable } from "@/lib/db/schema";
import { env } from "@/lib/env/server";
import { z } from "zod";

const connectIntegrationSchema = z.object({ slug: z.string().trim().min(1).max(100) });

export async function GET() {
  const { db, workspace } = await requireDashboardContext();
  const integrations = await db.query.integration.findMany({
    where: (fields, { eq }) => eq(fields.workspaceId, workspace.id),
    orderBy: (fields, { asc }) => [asc(fields.provider)],
  });

  const composio = env.COMPOSIO_API_KEY ? createComposioClient() : null;
  const verified = await Promise.all(
    integrations.map(async (integration) => {
      if (!composio || !integration.connectedAccountId) {
        return integration.status === "DISCONNECTED"
          ? integration
          : { ...integration, status: "ERROR" };
      }
      try {
        const account = await composio.connectedAccounts.get(integration.connectedAccountId, {
          signal: AbortSignal.timeout(5_000),
        });
        const expectedToolkit = COMPOSIO_TOOLKITS[integration.provider as ComposioProvider];
        const isActive = account.status === "ACTIVE" && account.toolkit.slug === expectedToolkit;
        return { ...integration, status: isActive ? "CONNECTED" : "ERROR" };
      } catch {
        return { ...integration, status: "ERROR" };
      }
    }),
  );

  return NextResponse.json(
    verified.map((integration) => ({
      id: integration.id,
      integrationSlug:
        COMPOSIO_PROVIDER_SLUGS[integration.provider as ComposioProvider] ??
        integration.provider.toLowerCase(),
      slug:
        COMPOSIO_PROVIDER_SLUGS[integration.provider as ComposioProvider] ??
        integration.provider.toLowerCase(),
      provider: integration.provider,
      status: integration.status,
      connectedAt: integration.updatedAt,
      metadata: {
        lastError: integration.lastError,
      },
    })),
  );
}

export async function POST(request: Request) {
  const { db, workspace } = await requireDashboardContext();
  const body = connectIntegrationSchema.safeParse(await request.json().catch(() => null));
  const slug = body.success ? body.data.slug.toLowerCase() : "";
  const provider = getComposioProviderBySlug(slug);

  if (!provider) {
    return NextResponse.json({ error: "Unsupported integration." }, { status: 400 });
  }

  try {
    const composio = createComposioClient();
    const toolkit = COMPOSIO_TOOLKITS[provider];
    const authConfigId = await getOrCreateAuthConfig(composio, toolkit);
    const callbackUrl = new URL(
      "/api/dashboard/integrations/callback",
      new URL(request.url).origin,
    );
    callbackUrl.searchParams.set("slug", slug);
    const workspaceAlias = workspace.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 40);
    const connection = await composio.connectedAccounts.link(
      workspace.id,
      authConfigId,
      {
        callbackUrl: callbackUrl.toString(),
        alias: `cogni-${workspaceAlias || "workspace"}-${workspace.id.slice(0, 8)}-${slug}`,
      },
      { signal: AbortSignal.timeout(15_000) },
    );
    if (!connection.redirectUrl) {
      return NextResponse.json(
        { error: "Composio did not return an authorization URL." },
        { status: 502 },
      );
    }

    const integrationId = randomUUID();
    const webhookToken = `${randomUUID()}${randomUUID()}`;

    await db
      .insert(integrationTable)
      .values({
        id: integrationId,
        workspaceId: workspace.id,
        provider,
        status: "CONNECTING",
        connectedAccountId: connection.id,
        config: JSON.stringify({ toolkit, authConfigId, webhookToken }),
        lastError: null,
        updatedAt: new Date().toISOString(),
      })
      .onConflictDoUpdate({
        target: [integrationTable.workspaceId, integrationTable.provider],
        set: {
          status: "CONNECTING",
          connectedAccountId: connection.id,
          config: JSON.stringify({ toolkit, authConfigId, webhookToken }),
          lastError: null,
          updatedAt: new Date().toISOString(),
        },
      });

    return NextResponse.json({ ok: true, redirectUrl: connection.redirectUrl });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not start the connection.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}

export async function DELETE(request: Request) {
  const { db, workspace } = await requireDashboardContext();
  const url = new URL(request.url);
  const slug = url.searchParams.get("slug");

  if (!slug) {
    return NextResponse.json({ error: "Integration slug is required." }, { status: 400 });
  }

  const provider = getComposioProviderBySlug(slug);

  if (!provider) {
    return NextResponse.json({ error: "Unsupported integration." }, { status: 400 });
  }

  const existing = await db.query.integration.findFirst({
    where: (fields, { and, eq }) =>
      and(eq(fields.workspaceId, workspace.id), eq(fields.provider, provider)),
  });
  if (existing?.connectedAccountId) {
    try {
      const composio = createComposioClient();
      await composio.connectedAccounts.delete(existing.connectedAccountId, {
        signal: AbortSignal.timeout(10_000),
      });
    } catch (error) {
      return NextResponse.json(
        { error: error instanceof Error ? error.message : "Could not disconnect integration." },
        { status: 502 },
      );
    }
  }

  await db
    .update(integrationTable)
    .set({
      status: "DISCONNECTED",
      connectedAccountId: null,
      externalAccountId: null,
      lastError: null,
      updatedAt: new Date().toISOString(),
    })
    .where(
      and(eq(integrationTable.workspaceId, workspace.id), eq(integrationTable.provider, provider)),
    );

  return NextResponse.json({ ok: true });
}
