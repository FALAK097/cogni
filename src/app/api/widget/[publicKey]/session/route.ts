import { randomUUID } from "node:crypto";
import { z } from "zod";

import { getVisitorConversationMessages } from "@/features/conversations/server/conversation-service";
import { parseJsonArray } from "@/features/widget/domain";
import { getHasWidgetConversationCond } from "@/features/widget/server/widget-data-filters";
import { assertPublicWidgetAccess, bearerToken } from "@/features/widget/server/widget-public";
import { createWidgetBootstrapToken } from "@/features/widget/server/widget-bootstrap";
import { getPublicWidget, validateEmbedOrigin } from "@/features/widget/server/widget-service";
import {
  toWidgetHistoryMessages,
  widgetPreflightResponse,
  withWidgetCors,
} from "@/features/widget/server/widget-utils";
import { requireDashboardContext } from "@/lib/auth/dashboard-context";
import { getDb } from "@/lib/db/client";

const PREVIEW_HOSTNAME = "dashboard-preview";

export function OPTIONS(request: Request) {
  return widgetPreflightResponse(request);
}

const sessionRequestSchema = z.object({
  sessionId: z.string().uuid().nullable().default(null),
  visitorId: z.string().uuid().nullable().default(null),
  hostname: z.string().trim().min(1).max(253).nullable().default(null),
  preview: z.boolean().default(false),
  metadata: z
    .object({
      hostname: z.string().trim().min(1).max(253).nullable().default(null),
    })
    .passthrough()
    .default({ hostname: null }),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ publicKey: string }> },
) {
  const parsed = sessionRequestSchema.safeParse(await request.json());
  if (!parsed.success) {
    return Response.json({ error: "Invalid widget session request." }, { status: 400 });
  }

  const { publicKey } = await params;
  const db = getDb();
  const hostname = parsed.data.preview
    ? PREVIEW_HOSTNAME
    : (parsed.data.metadata.hostname ?? parsed.data.hostname ?? "unknown")
        .toLowerCase()
        .replace(/\.$/, "");

  if (parsed.data.preview) {
    try {
      const { workspace } = await requireDashboardContext();
      const widget = await getPublicWidget(db, publicKey);
      if (!widget || widget.workspaceId !== workspace.id) {
        return Response.json({ error: "Preview access denied." }, { status: 403 });
      }

      const browserSessionId = parsed.data.sessionId ?? randomUUID();
      const visitorId = parsed.data.visitorId ?? randomUUID();

      return Response.json({
        sessionId: null,
        browserSessionId,
        token: createWidgetBootstrapToken({
          widgetId: widget.id,
          publicKey: widget.publicKey,
          browserSessionId,
          visitorId,
          hostname: PREVIEW_HOSTNAME,
        }),
        workspaceId: widget.workspaceId,
        publicKey: widget.publicKey,
        isNew: true,
        preview: true,
        enableLeadCapture: false,
        leadCaptureKeywords: [],
        enableBrochure: widget.enableBrochure,
        brochureSuggestionText: widget.brochureSuggestionText,
        messages: [],
      });
    } catch {
      return Response.json({ error: "Preview access denied." }, { status: 403 });
    }
  }

  const access = await assertPublicWidgetAccess(db, publicKey, request);
  if ("error" in access) return access.error;

  const { widget, origin, allowedDomains } = access;
  const token = bearerToken(request);
  const nowIso = new Date().toISOString();

  const visitorSession =
    parsed.data.sessionId && token
      ? await db.query.visitorSession.findFirst({
          where: (fields, { eq, and, gt }) => {
            const conds = [
              eq(fields.widgetId, widget.id),
              eq(fields.browserSessionId, parsed.data.sessionId!),
              eq(fields.token, token),
              gt(fields.messageCount, 0),
              gt(fields.expiresAt, nowIso),
              getHasWidgetConversationCond(fields),
            ];
            if (parsed.data.visitorId) {
              conds.push(eq(fields.visitorId, parsed.data.visitorId));
            }
            return and(...conds);
          },
        })
      : null;

  const browserSessionExists =
    !visitorSession && parsed.data.sessionId
      ? await db.query.visitorSession.findFirst({
          where: (fields, { eq, and }) =>
            and(
              eq(fields.widgetId, widget.id),
              eq(fields.browserSessionId, parsed.data.sessionId!),
            ),
          columns: { id: true },
        })
      : null;

  const browserSessionId = browserSessionExists ? randomUUID() : parsed.data.sessionId;

  const messages = visitorSession
    ? await getVisitorConversationMessages({
        db,
        visitorSessionId: visitorSession.id,
      })
    : [];

  const response = Response.json({
    sessionId: visitorSession?.id ?? null,
    browserSessionId,
    token:
      visitorSession?.token ??
      (browserSessionId
        ? createWidgetBootstrapToken({
            widgetId: widget.id,
            publicKey: widget.publicKey,
            browserSessionId,
            visitorId: parsed.data.visitorId,
            hostname,
          })
        : null),
    workspaceId: widget.workspaceId,
    publicKey: widget.publicKey,
    isNew: visitorSession === null,
    preview: false,
    enableLeadCapture: widget.enableLeadCapture,
    leadCaptureKeywords: parseJsonArray(widget.leadCaptureKeywords),
    enableBrochure: widget.enableBrochure,
    brochureSuggestionText: widget.brochureSuggestionText,
    visitor: visitorSession
      ? {
          name: visitorSession.name,
          email: visitorSession.email,
          phone: visitorSession.phone,
          leadCapturedAt: visitorSession.leadCapturedAt
            ? new Date(visitorSession.leadCapturedAt).toISOString()
            : null,
        }
      : null,
    messages: toWidgetHistoryMessages(messages),
  });

  return withWidgetCors(response, origin, validateEmbedOrigin(origin, allowedDomains));
}
