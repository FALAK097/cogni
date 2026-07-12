import { getCloudflareContext } from "@opennextjs/cloudflare";

import type { ConversationRoom } from "../../../../../../../cloudflare-worker";
import { requireDashboardContext } from "@/lib/auth/dashboard-context";

type RouteContext = { params: Promise<{ conversation_id: string }> };

export async function GET(request: Request, context: RouteContext) {
  const { db, workspace } = await requireDashboardContext();
  const { conversation_id: conversationId } = await context.params;
  const conversation = await db.query.conversation.findFirst({
    where: (fields, { eq, and }) =>
      and(eq(fields.id, conversationId), eq(fields.workspaceId, workspace.id)),
    columns: { id: true },
  });
  if (!conversation) return Response.json({ error: "Conversation not found." }, { status: 404 });
  const environment = getCloudflareContext().env as CloudflareEnv & {
    CONVERSATION_ROOMS: DurableObjectNamespace<ConversationRoom>;
  };
  return environment.CONVERSATION_ROOMS.getByName(conversation.id).fetch(request);
}
