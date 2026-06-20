import { recordVisitorMessage } from "@/features/conversations/server/conversation-service";
import { getDb } from "@/lib/db/client";
import { checkRateLimit } from "@/lib/rate-limit/memory";
import { isAllowedUpload, saveObject, uploadPublicPath } from "@/lib/storage/index";

function bearerToken(request: Request) {
  const authorization = request.headers.get("authorization");
  return authorization?.startsWith("Bearer ") ? authorization.slice(7) : null;
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ publicKey: string }> },
) {
  const token = bearerToken(request);
  if (!token) {
    return Response.json({ error: "Widget session is required." }, { status: 401 });
  }

  const { publicKey } = await params;
  const db = getDb();
  const visitorSession = await db.visitorSession.findFirst({
    where: {
      token,
      expiresAt: { gt: new Date() },
      widget: {
        publicKey,
        isEnabled: true,
      },
    },
    include: {
      widget: {
        select: {
          id: true,
          workspaceId: true,
        },
      },
    },
  });

  if (!visitorSession) {
    return Response.json({ error: "Widget session is invalid or expired." }, { status: 401 });
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

  const formData = await request.formData();
  const file = formData.get("file");

  if (!(file instanceof File)) {
    return Response.json({ error: "Choose a file to upload." }, { status: 400 });
  }

  const bytes = Buffer.from(await file.arrayBuffer());
  const mimeType = file.type || "application/octet-stream";

  if (!isAllowedUpload(mimeType, bytes.length)) {
    return Response.json({ error: "This file type or size is not allowed." }, { status: 400 });
  }

  const conversation = await recordVisitorMessage({
    db,
    visitorSession: {
      ...visitorSession,
      widget: {
        id: visitorSession.widget.id,
        workspace: { id: visitorSession.widget.workspaceId },
      },
    },
    text: `Uploaded ${file.name}`,
  });

  const message = await db.message.findFirst({
    where: {
      conversationId: conversation.id,
      authorType: "VISITOR",
    },
    orderBy: { createdAt: "desc" },
    select: { id: true },
  });

  if (!message) {
    return Response.json({ error: "Could not attach the file." }, { status: 500 });
  }

  const saved = await saveObject({
    workspaceId: visitorSession.widget.workspaceId,
    filename: file.name,
    mimeType,
    bytes,
  });

  const attachment = await db.attachment.create({
    data: {
      workspaceId: visitorSession.widget.workspaceId,
      messageId: message.id,
      filename: saved.filename,
      mimeType: saved.mimeType,
      size: saved.size,
      storageKey: saved.storageKey,
    },
  });

  return Response.json({
    attachment: {
      id: attachment.id,
      filename: attachment.filename,
      url: uploadPublicPath(attachment.storageKey),
    },
  });
}
