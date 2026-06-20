import {
  listWorkspaceCampaigns,
  createCampaign,
} from "@/features/campaigns/server/campaign-service";
import { requireDashboardContext } from "@/lib/auth/dashboard-context";

export async function GET() {
  const { db, workspace } = await requireDashboardContext();
  const campaigns = await listWorkspaceCampaigns(db, workspace.id);
  return Response.json({
    campaigns: campaigns.map((campaign) => ({
      id: campaign.id,
      name: campaign.name,
      description: campaign.description,
      instructions: campaign.instructions,
      isActive: campaign.isActive,
      documentCount: campaign.documents.length,
      leadCount: campaign._count.leads,
    })),
  });
}

export async function POST(request: Request) {
  const { db, workspace } = await requireDashboardContext();
  const body = (await request.json()) as {
    name?: string;
    description?: string;
    instructions?: string;
    documentIds?: string[];
  };

  if (!body.name?.trim()) {
    return Response.json({ error: "Campaign name is required." }, { status: 400 });
  }

  const campaign = await createCampaign(db, workspace.id, {
    name: body.name.trim(),
    description: body.description ?? null,
    instructions: body.instructions ?? null,
    documentIds: body.documentIds,
  });

  return Response.json({ campaign }, { status: 201 });
}
