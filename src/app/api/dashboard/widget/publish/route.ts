import { NextResponse } from "next/server";
import { z } from "zod";

import {
  ensureWorkspaceWidget,
  getWidgetPublicationStatus,
  toWidgetSettings,
} from "@/features/widget/server/widget-service";
import { publishWidgetDraft } from "@/features/widget/server/widget-publication-service";
import { requireDashboardContext } from "@/lib/auth/dashboard-context";
import { canManageWorkspace } from "@/lib/auth/permissions";

const publishRequestSchema = z
  .object({ restoreVersion: z.number().int().positive().optional() })
  .strict();

async function dashboardConfig(
  db: Parameters<typeof ensureWorkspaceWidget>[0],
  workspaceId: string,
) {
  const saved = await ensureWorkspaceWidget(db, workspaceId);
  const settings = toWidgetSettings(saved);
  const publication = await getWidgetPublicationStatus(db, saved);
  return {
    ...settings,
    workspaceId,
    agentName: settings.displayName,
    allowedDomains: settings.authorizedDomains,
    borderRadius: settings.borderRadiusStyle,
    publication,
  };
}

export async function POST(request: Request) {
  const { db, workspace, membership, session } = await requireDashboardContext();
  if (!canManageWorkspace(membership.role)) {
    return NextResponse.json(
      { error: "Only workspace owners can publish agent changes." },
      { status: 403 },
    );
  }

  const input = publishRequestSchema.safeParse(await request.json().catch(() => null));
  if (!input.success) {
    return NextResponse.json({ error: "Invalid publish request." }, { status: 400 });
  }

  const result = await publishWidgetDraft(
    db,
    workspace.id,
    session.user.id,
    input.data.restoreVersion,
  );
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }
  return NextResponse.json(await dashboardConfig(db, workspace.id));
}
