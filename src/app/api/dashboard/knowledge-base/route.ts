import { NextResponse } from "next/server";

import { listDocuments } from "@/features/knowledge/queries";
import { requireDashboardContext } from "@/lib/auth/dashboard-context";

const DEFAULT_KB_ID = "default";

export async function GET(request: Request) {
  const { workspace } = await requireDashboardContext();
  const { searchParams } = new URL(request.url);
  const knowledgeBaseId = searchParams.get("knowledgeBaseId");

  if (knowledgeBaseId && knowledgeBaseId !== DEFAULT_KB_ID) {
    return NextResponse.json({ error: "Knowledge base not found." }, { status: 404 });
  }

  const documents = await listDocuments(workspace.id);
  const now = new Date().toISOString();

  return NextResponse.json({
    knowledgeBases: [
      {
        id: DEFAULT_KB_ID,
        workspaceId: workspace.id,
        name: "Workspace Knowledge",
        status: "ready",
        sourceCount: documents.length,
        createdAt: now,
        updatedAt: now,
      },
    ],
    count: 1,
  });
}

export async function POST(request: Request) {
  const { workspace } = await requireDashboardContext();
  const body = (await request.json()) as { name?: string };
  const now = new Date().toISOString();

  return NextResponse.json({
    knowledgeBase: {
      id: DEFAULT_KB_ID,
      workspaceId: workspace.id,
      name: body.name?.trim() || "Workspace Knowledge",
      status: "ready",
      sourceCount: 0,
      createdAt: now,
      updatedAt: now,
    },
  });
}
