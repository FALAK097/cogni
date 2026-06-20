import { NextResponse } from "next/server";

import { requireDashboardContext } from "@/lib/auth/dashboard-context";

const PROVIDER_SLUGS: Record<string, string> = {
  GMAIL: "gmail",
  GOOGLE_CALENDAR: "google-calendar",
  SLACK: "slack",
};

export async function GET() {
  const { db, workspace } = await requireDashboardContext();
  const integrations = await db.integration.findMany({
    where: { workspaceId: workspace.id },
    orderBy: { provider: "asc" },
  });

  return NextResponse.json(
    integrations.map((integration) => ({
      id: integration.id,
      integrationSlug: PROVIDER_SLUGS[integration.provider] ?? integration.provider.toLowerCase(),
      slug: PROVIDER_SLUGS[integration.provider] ?? integration.provider.toLowerCase(),
      provider: integration.provider,
      status: integration.status,
      connectedAt: integration.updatedAt.toISOString(),
      metadata: {},
    })),
  );
}

export async function POST(request: Request) {
  const { db, workspace } = await requireDashboardContext();
  const body = (await request.json()) as { slug?: string };
  const slug = body.slug?.toLowerCase();

  const provider =
    slug === "gmail"
      ? "GMAIL"
      : slug === "google-calendar"
        ? "GOOGLE_CALENDAR"
        : slug === "slack"
          ? "SLACK"
          : null;

  if (!provider) {
    return NextResponse.json({ error: "Unsupported integration." }, { status: 400 });
  }

  await db.integration.upsert({
    where: {
      workspaceId_provider: {
        workspaceId: workspace.id,
        provider,
      },
    },
    create: {
      workspaceId: workspace.id,
      provider,
      status: "CONNECTED",
    },
    update: {
      status: "CONNECTED",
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

  const provider =
    slug === "gmail"
      ? "GMAIL"
      : slug === "google-calendar"
        ? "GOOGLE_CALENDAR"
        : slug === "slack"
          ? "SLACK"
          : null;

  if (!provider) {
    return NextResponse.json({ error: "Unsupported integration." }, { status: 400 });
  }

  await db.integration.updateMany({
    where: { workspaceId: workspace.id, provider },
    data: { status: "DISCONNECTED" },
  });

  return NextResponse.json({ ok: true });
}
