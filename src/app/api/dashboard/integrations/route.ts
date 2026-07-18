import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { eq, and } from "drizzle-orm";
import {
  COMPOSIO_TOOLKITS,
  createComposioClient,
  getOrCreateManagedAuthConfig,
  type ComposioProvider,
} from "@/features/integrations/server/composio-connections";
import { requireDashboardContext } from "@/lib/auth/dashboard-context";
import { integration as integrationTable } from "@/lib/db/schema";
import { env } from "@/lib/env/server";

const PROVIDER_SLUGS: Record<string, string> = {
  GMAIL: "gmail",
  GOOGLE_CALENDAR: "google-calendar",
  SLACK: "slack",
  DISCORD: "discord",
  GCHAT: "google-chat",
  WHATSAPP: "whatsapp",
  TEAMS: "microsoft-teams",
};

const SLUG_PROVIDERS = Object.fromEntries(
  Object.entries(PROVIDER_SLUGS).map(([provider, slug]) => [slug, provider]),
) as Record<string, string>;

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
      integrationSlug: PROVIDER_SLUGS[integration.provider] ?? integration.provider.toLowerCase(),
      slug: PROVIDER_SLUGS[integration.provider] ?? integration.provider.toLowerCase(),
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
  const body = (await request.json()) as { slug?: string };
  const slug = body.slug?.toLowerCase();

  const provider = slug ? (SLUG_PROVIDERS[slug] as ComposioProvider | undefined) : undefined;

  if (!provider) {
    return NextResponse.json({ error: "Unsupported integration." }, { status: 400 });
  }

  const composio = createComposioClient();
  const toolkit = COMPOSIO_TOOLKITS[provider];
  const authConfigId = await getOrCreateManagedAuthConfig(composio, toolkit);
  const callbackUrl = new URL("/api/dashboard/integrations/callback", new URL(request.url).origin);
  callbackUrl.searchParams.set("slug", slug!);
  const connection = await composio.connectedAccounts.link(
    workspace.id,
    authConfigId,
    { callbackUrl: callbackUrl.toString(), alias: `cogni-${workspace.id}-${slug}` },
    { signal: AbortSignal.timeout(15_000) },
  );
  if (!connection.redirectUrl) {
    return NextResponse.json(
      { error: "Composio did not return an authorization URL." },
      { status: 502 },
    );
  }

  await db
    .insert(integrationTable)
    .values({
      id: randomUUID(),
      workspaceId: workspace.id,
      provider,
      status: "CONNECTING",
      connectedAccountId: connection.id,
      config: JSON.stringify({ toolkit, authConfigId }),
      lastError: null,
      updatedAt: new Date().toISOString(),
    })
    .onConflictDoUpdate({
      target: [integrationTable.workspaceId, integrationTable.provider],
      set: {
        status: "CONNECTING",
        connectedAccountId: connection.id,
        config: JSON.stringify({ toolkit, authConfigId }),
        lastError: null,
        updatedAt: new Date().toISOString(),
      },
    });

  return NextResponse.json({ ok: true, redirectUrl: connection.redirectUrl });
}

export async function DELETE(request: Request) {
  const { db, workspace } = await requireDashboardContext();
  const url = new URL(request.url);
  const slug = url.searchParams.get("slug");

  if (!slug) {
    return NextResponse.json({ error: "Integration slug is required." }, { status: 400 });
  }

  const provider = SLUG_PROVIDERS[slug];

  if (!provider) {
    return NextResponse.json({ error: "Unsupported integration." }, { status: 400 });
  }

  const existing = await db.query.integration.findFirst({
    where: (fields, { and, eq }) =>
      and(eq(fields.workspaceId, workspace.id), eq(fields.provider, provider)),
  });
  if (existing?.connectedAccountId) {
    const composio = createComposioClient();
    await composio.connectedAccounts.delete(existing.connectedAccountId, {
      signal: AbortSignal.timeout(10_000),
    });
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
