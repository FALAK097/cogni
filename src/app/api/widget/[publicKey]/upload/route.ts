import { z } from "zod";
import { randomUUID } from "node:crypto";

import {
  recordVisitorMessage,
  startVisitorConversation,
  type MessageJson,
} from "@/features/conversations/server/conversation-service";
import {
  assertPublicWidgetAccess,
  bearerToken,
  getAuthorizedVisitorSession,
} from "@/features/widget/server/widget-public";
import { verifyWidgetBootstrapToken } from "@/features/widget/server/widget-bootstrap";
import { getRequestOrigin, withWidgetCors } from "@/features/widget/server/widget-utils";
import { validateEmbedOrigin } from "@/features/widget/server/widget-service";
import { getDb } from "@/lib/db/client";
import { attachment as attachmentTable } from "@/lib/db/schema";
import { checkRateLimit } from "@/lib/rate-limit/memory";
import { deleteObject, isAllowedUpload, saveObject, uploadPublicPath } from "@/lib/storage/index";

const metadataSchema = z.object({
  hostname: z.string().trim().min(1).max(253),
  pageUrl: z.string().max(2_000).nullable().default(null),
  referrer: z.string().max(2_000).nullable().default(null),
  browser: z.string().max(100).nullable().default(null),
  deviceType: z.string().max(50).nullable().default(null),
  os: z.string().max(100).nullable().default(null),
  country: z.string().max(100).nullable().default(null),
  city: z.string().max(100).nullable().default(null),
  timezone: z.string().max(100).nullable().default(null),
  language: z.string().max(50).nullable().default(null),
  screenSize: z.string().max(50).nullable().default(null),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ publicKey: string }> },
) {
  const { publicKey } = await params;
  const formData = await request.formData();
  const file = formData.get("file");
  const sessionId = formData.get("sessionId");
  const visitorId = formData.get("visitorId");
  const interactionId = formData.get("interactionId");
  const rawMetadata = formData.get("metadata");

  if (
    !(file instanceof File) ||
    typeof sessionId !== "string" ||
    typeof interactionId !== "string" ||
    typeof rawMetadata !== "string"
  ) {
    return Response.json({ error: "Invalid upload request." }, { status: 400 });
  }

  let metadataJson: unknown;
  try {
    metadataJson = JSON.parse(rawMetadata);
  } catch {
    return Response.json({ error: "Invalid upload metadata." }, { status: 400 });
  }
  const metadata = metadataSchema.safeParse(metadataJson);
  if (
    !metadata.success ||
    !z.string().uuid().safeParse(sessionId).success ||
    !z.string().uuid().safeParse(interactionId).success
  ) {
    return Response.json({ error: "Invalid upload metadata." }, { status: 400 });
  }

  const db = getDb();
  const access = await assertPublicWidgetAccess(db, publicKey, request);
  if ("error" in access) return access.error;

  const token = bearerToken(request);
  if (!token) {
    return Response.json({ error: "Widget session is required." }, { status: 401 });
  }
  const rateLimit = checkRateLimit({
    key: `widget-upload:${token}`,
    limit: 10,
    windowMs: 60_000,
  });
  if (!rateLimit.allowed) {
    return Response.json(
      { error: "Too many uploads. Wait a moment before trying again." },
      { status: 429 },
    );
  }

  const authorizedSession = token ? await getAuthorizedVisitorSession(db, publicKey, token) : null;
  const bootstrapClaims = authorizedSession ? null : verifyWidgetBootstrapToken(token);
  if (
    !authorizedSession &&
    (!bootstrapClaims ||
      bootstrapClaims.widgetId !== access.widget.id ||
      bootstrapClaims.publicKey !== publicKey ||
      bootstrapClaims.browserSessionId !== sessionId ||
      bootstrapClaims.hostname !== metadata.data.hostname)
  ) {
    return Response.json({ error: "Widget session is invalid or expired." }, { status: 401 });
  }
  if (bootstrapClaims) {
    const existingSession = await db.query.visitorSession.findFirst({
      where: (fields, { eq, and }) =>
        and(eq(fields.widgetId, access.widget.id), eq(fields.browserSessionId, sessionId)),
      columns: { id: true, token: true },
    });
    if (existingSession) {
      const conversation = await db.query.conversation.findFirst({
        where: (fields, { eq, and }) =>
          and(eq(fields.visitorSessionId, existingSession.id), eq(fields.channel, "WIDGET")),
      });
      if (conversation) {
        const messagesList = JSON.parse(conversation.messages || "[]") as MessageJson[];
        const existingMsg = messagesList.find((m) => m.clientId === interactionId);
        const existingAttachment = existingMsg
          ? await db.query.attachment.findFirst({
              where: (fields, { eq, and }) =>
                and(eq(fields.conversationId, conversation.id), eq(fields.filename, file.name)),
            })
          : null;

        if (!existingAttachment) {
          const hasConflict = messagesList.some((m) => m.clientId !== interactionId);
          if (hasConflict) {
            return Response.json({ error: "Widget session is already active." }, { status: 401 });
          }
        } else {
          const origin = getRequestOrigin(request);
          return withWidgetCors(
            Response.json({
              sessionId: existingSession.id,
              token: existingSession.token,
              attachment: {
                id: existingAttachment.id,
                filename: existingAttachment.filename,
                url: uploadPublicPath(existingAttachment.storageKey),
              },
            }),
            origin,
            validateEmbedOrigin(origin, access.allowedDomains),
          );
        }
      }
    }
  }
  if (authorizedSession) {
    const conversation = await db.query.conversation.findFirst({
      where: (fields, { eq, and }) =>
        and(eq(fields.visitorSessionId, authorizedSession.id), eq(fields.channel, "WIDGET")),
    });
    if (conversation) {
      const messagesList = JSON.parse(conversation.messages || "[]") as MessageJson[];
      const existingMsg = messagesList.find((m) => m.clientId === interactionId);
      const existingAttachment = existingMsg
        ? await db.query.attachment.findFirst({
            where: (fields, { eq, and }) =>
              and(eq(fields.conversationId, conversation.id), eq(fields.filename, file.name)),
          })
        : null;

      if (existingAttachment) {
        const origin = getRequestOrigin(request);
        return withWidgetCors(
          Response.json({
            sessionId: authorizedSession.id,
            token: authorizedSession.token,
            attachment: {
              id: existingAttachment.id,
              filename: existingAttachment.filename,
              url: uploadPublicPath(existingAttachment.storageKey),
            },
          }),
          origin,
          validateEmbedOrigin(origin, access.allowedDomains),
        );
      }
    }
  }

  const bytes = Buffer.from(await file.arrayBuffer());
  const mimeType = file.type || "application/octet-stream";
  if (!isAllowedUpload(mimeType, bytes.length)) {
    return Response.json({ error: "This file type or size is not allowed." }, { status: 400 });
  }

  const saved = await saveObject({
    workspaceId: access.widget.workspaceId,
    filename: file.name,
    mimeType,
    bytes,
  });

  try {
    const started = authorizedSession
      ? {
          visitorSession: authorizedSession,
          ...(await recordVisitorMessage({
            db,
            visitorSession: authorizedSession,
            text: `Uploaded ${file.name}`,
            clientMessageId: interactionId,
          })),
        }
      : await startVisitorConversation({
          db,
          widget: access.widget,
          hostname: metadata.data.hostname,
          browserSessionId: sessionId,
          visitorId:
            bootstrapClaims?.visitorId ?? (typeof visitorId === "string" ? visitorId : null),
          metadata: {
            ...metadata.data,
            country: metadata.data.country ?? request.headers.get("x-vercel-ip-country"),
            city: metadata.data.city ?? request.headers.get("x-vercel-ip-city"),
            timezone: metadata.data.timezone ?? request.headers.get("x-vercel-ip-timezone"),
          },
          identity: { name: null, email: null },
          text: `Uploaded ${file.name}`,
          clientMessageId: interactionId,
        });

    const [attachment] = await db
      .insert(attachmentTable)
      .values({
        id: randomUUID(),
        workspaceId: access.widget.workspaceId,
        conversationId: started.conversation.id,
        filename: saved.filename,
        mimeType: saved.mimeType,
        size: saved.size,
        storageKey: saved.storageKey,
      })
      .returning();

    const origin = getRequestOrigin(request);
    return withWidgetCors(
      Response.json({
        sessionId: started.visitorSession.id,
        token: started.visitorSession.token,
        attachment: {
          id: attachment.id,
          filename: attachment.filename,
          url: uploadPublicPath(attachment.storageKey),
        },
      }),
      origin,
      validateEmbedOrigin(origin, access.allowedDomains),
    );
  } catch {
    await deleteObject(saved.storageKey);
    return Response.json({ error: "Could not attach the file." }, { status: 500 });
  }
}
