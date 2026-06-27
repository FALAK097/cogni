import { getDb } from "@/lib/db/client";
import { requireDashboardContext } from "@/lib/auth/dashboard-context";
import { readObject } from "@/lib/storage/index";

function bearerToken(request: Request) {
  const authorization = request.headers.get("authorization");
  return authorization?.startsWith("Bearer ") ? authorization.slice(7) : null;
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ storageKey: string[] }> },
) {
  const { storageKey: storageKeyParts } = await params;
  const storageKey = storageKeyParts.map(decodeURIComponent).join("/");
  const db = getDb();

  const attachment = await db.query.attachment.findFirst({
    where: (fields, { eq }) => eq(fields.storageKey, storageKey),
    columns: {
      filename: true,
      mimeType: true,
      workspaceId: true,
    },
  });

  if (!attachment) {
    return new Response("Not found", { status: 404 });
  }

  const widgetToken = bearerToken(request);
  let authorized = false;

  if (widgetToken) {
    const nowIso = new Date().toISOString();
    const session = await db.query.visitorSession.findFirst({
      where: (fields, { eq, and, gt }) =>
        and(eq(fields.token, widgetToken), gt(fields.expiresAt, nowIso)),
      with: {
        widget: {
          columns: { workspaceId: true },
        },
      },
    });
    authorized = Boolean(session && session.widget?.workspaceId === attachment.workspaceId);
  } else {
    try {
      const { workspace } = await requireDashboardContext();
      authorized = workspace.id === attachment.workspaceId;
    } catch {
      authorized = false;
    }
  }

  if (!authorized) {
    return new Response("Forbidden", { status: 403 });
  }

  const bytes = await readObject(storageKey);

  return new Response(bytes, {
    headers: {
      "Content-Type": attachment.mimeType,
      "Content-Disposition": `inline; filename="${attachment.filename.replace(/"/g, "")}"`,
      "Cache-Control": "private, max-age=3600",
    },
  });
}
