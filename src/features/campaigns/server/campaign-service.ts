import "server-only";

import type { PrismaClient } from "@/generated/prisma/client";

export async function listWorkspaceCampaigns(db: PrismaClient, workspaceId: string) {
  return db.campaign.findMany({
    where: { workspaceId, isActive: true },
    orderBy: { updatedAt: "desc" },
    include: {
      documents: {
        include: {
          document: {
            select: { id: true, title: true, status: true },
          },
        },
      },
      _count: {
        select: { leads: true },
      },
    },
  });
}

export async function getCampaignById(db: PrismaClient, workspaceId: string, campaignId: string) {
  return db.campaign.findFirst({
    where: { id: campaignId, workspaceId },
    include: {
      documents: {
        include: {
          document: {
            select: { id: true, title: true, status: true },
          },
        },
      },
    },
  });
}

export function buildCampaignPromptContext(campaign: {
  name: string;
  description: string | null;
  instructions: string | null;
}) {
  const parts = [`Campaign: ${campaign.name}`];
  if (campaign.description?.trim()) {
    parts.push(`Description: ${campaign.description.trim()}`);
  }
  if (campaign.instructions?.trim()) {
    parts.push(`Instructions: ${campaign.instructions.trim()}`);
  }
  return parts.join("\n");
}

export async function getCampaignDocumentIds(
  db: PrismaClient,
  workspaceId: string,
  campaignId: string | null | undefined,
) {
  if (!campaignId) return null;

  const campaign = await getCampaignById(db, workspaceId, campaignId);
  if (!campaign) return null;

  const documentIds = campaign.documents
    .map((entry) => entry.documentId)
    .filter((documentId) => {
      const document = campaign.documents.find(
        (entry) => entry.documentId === documentId,
      )?.document;
      return document?.status === "READY";
    });

  return documentIds.length > 0 ? documentIds : null;
}

export async function createCampaign(
  db: PrismaClient,
  workspaceId: string,
  input: {
    name: string;
    description?: string | null;
    instructions?: string | null;
    documentIds?: string[];
  },
) {
  return db.$transaction(async (tx) => {
    const campaign = await tx.campaign.create({
      data: {
        workspaceId,
        name: input.name,
        description: input.description ?? null,
        instructions: input.instructions ?? null,
      },
    });

    if (input.documentIds?.length) {
      await tx.campaignDocument.createMany({
        data: input.documentIds.map((documentId) => ({
          campaignId: campaign.id,
          documentId,
        })),
      });
    }

    return campaign;
  });
}

export async function updateCampaign(
  db: PrismaClient,
  workspaceId: string,
  campaignId: string,
  input: {
    name?: string;
    description?: string | null;
    instructions?: string | null;
    isActive?: boolean;
    documentIds?: string[];
  },
) {
  return db.$transaction(async (tx) => {
    const existing = await tx.campaign.findFirst({
      where: { id: campaignId, workspaceId },
    });
    if (!existing) return null;

    const campaign = await tx.campaign.update({
      where: { id: campaignId },
      data: {
        name: input.name ?? existing.name,
        description: input.description === undefined ? existing.description : input.description,
        instructions: input.instructions === undefined ? existing.instructions : input.instructions,
        isActive: input.isActive ?? existing.isActive,
      },
    });

    if (input.documentIds) {
      await tx.campaignDocument.deleteMany({ where: { campaignId } });
      if (input.documentIds.length > 0) {
        await tx.campaignDocument.createMany({
          data: input.documentIds.map((documentId) => ({
            campaignId,
            documentId,
          })),
        });
      }
    }

    return campaign;
  });
}

export async function deleteCampaign(db: PrismaClient, workspaceId: string, campaignId: string) {
  const existing = await db.campaign.findFirst({
    where: { id: campaignId, workspaceId },
  });
  if (!existing) return false;

  await db.campaign.delete({ where: { id: campaignId } });
  return true;
}
