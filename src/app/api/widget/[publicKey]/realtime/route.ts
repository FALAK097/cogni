import { getCloudflareContext } from "@opennextjs/cloudflare";

import type { ConversationRoom } from "../../../../../../cloudflare-worker";
import { requireAuthorizedVisitorSession } from "@/features/widget/server/widget-public";
import { getDb } from "@/lib/db/client";

type RouteContext = { params: Promise<{ publicKey: string }> };

export async function GET(request: Request, context: RouteContext) {
  const { publicKey } = await context.params;
  const db = getDb();
  const visitor = await requireAuthorizedVisitorSession(db, publicKey, request);
  if ("error" in visitor) return visitor.error;
  const conversationId = new URL(request.url).searchParams.get("conversationId");
  if (!conversationId)
    return Response.json({ error: "Conversation is required." }, { status: 400 });
  const conversation = await db.query.conversation.findFirst({
    where: (fields, { eq, and }) =>
      and(eq(fields.id, conversationId), eq(fields.visitorSessionId, visitor.session.id)),
    columns: { id: true },
  });
  if (!conversation) return Response.json({ error: "Conversation not found." }, { status: 404 });
  const environment = getCloudflareContext().env as CloudflareEnv & {
    CONVERSATION_ROOMS: DurableObjectNamespace<ConversationRoom>;
  };
  return environment.CONVERSATION_ROOMS.getByName(conversation.id).fetch(request);
}
