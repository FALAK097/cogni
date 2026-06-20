import { NextResponse } from "next/server";

import {
  deleteCampaign,
  getCampaignById,
  updateCampaign,
} from "@/features/campaigns/server/campaign-service";
import { requireDashboardContext } from "@/lib/auth/dashboard-context";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const { db, workspace } = await requireDashboardContext();
  const { id } = await context.params;
  const campaign = await getCampaignById(db, workspace.id, id);

  if (!campaign) {
    return NextResponse.json({ error: "Campaign not found." }, { status: 404 });
  }

  return NextResponse.json({
    campaign: {
      id: campaign.id,
      name: campaign.name,
      description: campaign.description,
      instructions: campaign.instructions,
      isActive: campaign.isActive,
      documents: campaign.documents.map((entry) => entry.document),
      documentIds: campaign.documents.map((entry) => entry.documentId),
    },
  });
}

export async function PUT(request: Request, context: RouteContext) {
  const { db, workspace } = await requireDashboardContext();
  const { id } = await context.params;
  const body = (await request.json()) as {
    name?: string;
    description?: string | null;
    instructions?: string | null;
    isActive?: boolean;
    documentIds?: string[];
  };

  const campaign = await updateCampaign(db, workspace.id, id, body);
  if (!campaign) {
    return NextResponse.json({ error: "Campaign not found." }, { status: 404 });
  }

  return NextResponse.json({ campaign });
}

export async function DELETE(_request: Request, context: RouteContext) {
  const { db, workspace } = await requireDashboardContext();
  const { id } = await context.params;
  const deleted = await deleteCampaign(db, workspace.id, id);

  if (!deleted) {
    return NextResponse.json({ error: "Campaign not found." }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
