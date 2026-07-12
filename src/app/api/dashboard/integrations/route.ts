import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { eq, and } from "drizzle-orm";
import { requireDashboardContext } from "@/lib/auth/dashboard-context";
import { integration as integrationTable } from "@/lib/db/schema";

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

  return NextResponse.json(
    integrations.map((integration) => ({
      id: integration.id,
      integrationSlug: PROVIDER_SLUGS[integration.provider] ?? integration.provider.toLowerCase(),
      slug: PROVIDER_SLUGS[integration.provider] ?? integration.provider.toLowerCase(),
      provider: integration.provider,
      status: integration.status,
      connectedAt: integration.updatedAt,
      metadata: {},
    })),
  );
}

export async function POST(request: Request) {
  const { db, workspace } = await requireDashboardContext();
  const body = (await request.json()) as { slug?: string };
  const slug = body.slug?.toLowerCase();

  const provider = slug ? SLUG_PROVIDERS[slug] : null;

  if (!provider) {
    return NextResponse.json({ error: "Unsupported integration." }, { status: 400 });
  }

  await db
    .insert(integrationTable)
    .values({
      id: randomUUID(),
      workspaceId: workspace.id,
      provider,
      status: "CONNECTED",
      config: JSON.stringify({ webhookToken: crypto.randomUUID() }),
      updatedAt: new Date().toISOString(),
    })
    .onConflictDoUpdate({
      target: [integrationTable.workspaceId, integrationTable.provider],
      set: {
        status: "CONNECTED",
        config: JSON.stringify({ webhookToken: crypto.randomUUID() }),
        updatedAt: new Date().toISOString(),
      },
    });

  return NextResponse.json({ ok: true });
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

  await db
    .update(integrationTable)
    .set({
      status: "DISCONNECTED",
      updatedAt: new Date().toISOString(),
    })
    .where(
      and(eq(integrationTable.workspaceId, workspace.id), eq(integrationTable.provider, provider)),
    );

  return NextResponse.json({ ok: true });
}
