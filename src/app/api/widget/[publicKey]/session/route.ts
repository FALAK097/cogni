import { z } from "zod";

import { getVisitorConversationMessages } from "@/features/conversations/server/conversation-service";
import type { WidgetChatMessage } from "@/features/widget/domain";
import { uploadPublicPath } from "@/lib/storage/local";
import {
  getPublicWidget,
  isHostnameAuthorized,
  resolveVisitorSession,
} from "@/features/widget/server/widget-service";
import { requireDashboardContext } from "@/lib/auth/dashboard-context";
import { getDb } from "@/lib/db/client";
import { checkRateLimit } from "@/lib/rate-limit/memory";

const sessionSchema = z.object({
  token: z.string().trim().min(1).max(200).nullish(),
  hostname: z.string().trim().min(1).max(253),
  preview: z.boolean().optional(),
});

function toWidgetChatMessages(
  messages: Awaited<ReturnType<typeof getVisitorConversationMessages>>,
): WidgetChatMessage[] {
  return messages.map((message) => {
    const attachmentLines =
      message.attachments?.map(
        (attachment) => `${attachment.filename}: ${uploadPublicPath(attachment.storageKey)}`,
      ) ?? [];
    const body =
      attachmentLines.length > 0 ? `${message.body}\n${attachmentLines.join("\n")}` : message.body;

    return {
      id: message.id,
      role: message.authorType === "VISITOR" ? "user" : "assistant",
      parts: [{ type: "text", text: body }],
    };
  });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ publicKey: string }> },
) {
  const parsed = sessionSchema.safeParse(await request.json());
  if (!parsed.success) {
    return Response.json({ error: "A valid session request is required." }, { status: 400 });
  }

  const rateLimit = checkRateLimit({
    key: `widget-session:${parsed.data.hostname}`,
    limit: 30,
    windowMs: 60_000,
  });

  if (!rateLimit.allowed) {
    return Response.json(
      { error: "Too many session requests. Try again shortly." },
      { status: 429 },
    );
  }

  const { publicKey } = await params;
  const db = getDb();
  const widget = await getPublicWidget(db, publicKey);

  if (!widget || !widget.isEnabled) {
    return Response.json({ error: "Widget is unavailable." }, { status: 404 });
  }

  const requestedHostname = parsed.data.hostname.toLowerCase().replace(/\.$/, "");

  if (parsed.data.preview || requestedHostname === "dashboard-preview") {
    try {
      const { workspace } = await requireDashboardContext();
      if (workspace.id !== widget.workspaceId) {
        return Response.json({ error: "Preview access denied." }, { status: 403 });
      }
    } catch {
      return Response.json({ error: "Preview access denied." }, { status: 403 });
    }
  } else if (!isHostnameAuthorized(requestedHostname, widget.authorizedDomains)) {
    return Response.json({ error: "This domain is not authorized." }, { status: 403 });
  }

  const visitorSession = await resolveVisitorSession({
    db,
    widgetId: widget.id,
    hostname: requestedHostname,
    token: parsed.data.token,
  });
  const messages = await getVisitorConversationMessages({
    db,
    visitorSessionId: visitorSession.id,
  });

  console.info("widget.session.resolved", {
    workspaceId: widget.workspaceId,
    widgetId: widget.id,
    visitorSessionId: visitorSession.id,
    restored: Boolean(parsed.data.token),
    messageCount: messages.length,
  });

  return Response.json({
    token: visitorSession.token,
    expiresAt: visitorSession.expiresAt.toISOString(),
    messages: toWidgetChatMessages(messages),
  });
}
