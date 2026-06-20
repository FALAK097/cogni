import { z } from "zod";

import { getDb } from "@/lib/db/client";
import { checkRateLimit } from "@/lib/rate-limit/memory";

const identifySchema = z.object({
  id: z.string().trim().min(1).max(200).optional(),
  name: z.string().trim().min(1).max(100).optional(),
  email: z.email().optional(),
});

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

  const parsed = identifySchema.safeParse(await request.json());
  if (!parsed.success || (!parsed.data.id && !parsed.data.email)) {
    return Response.json({ error: "A customer ID or email address is required." }, { status: 400 });
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
        select: { workspaceId: true },
      },
    },
  });

  if (!visitorSession) {
    return Response.json({ error: "Widget session is invalid or expired." }, { status: 401 });
  }

  const rateLimit = checkRateLimit({
    key: `widget-identify:${token}`,
    limit: 20,
    windowMs: 60_000,
  });

  if (!rateLimit.allowed) {
    return Response.json(
      { error: "Too many identify requests. Try again shortly." },
      { status: 429 },
    );
  }

  const contact = await db.contact.findFirst({
    where: {
      workspaceId: visitorSession.widget.workspaceId,
      OR: [
        ...(parsed.data.id ? [{ externalId: parsed.data.id }] : []),
        ...(parsed.data.email ? [{ email: parsed.data.email }] : []),
      ],
    },
  });
  const name =
    parsed.data.name ?? parsed.data.email?.split("@")[0] ?? contact?.name ?? "Website visitor";
  const resolvedContact = contact
    ? await db.contact.update({
        where: { id: contact.id },
        data: {
          name,
          email: parsed.data.email ?? contact.email,
          externalId: parsed.data.id ?? contact.externalId,
          lastSeenAt: new Date(),
        },
      })
    : await db.contact.create({
        data: {
          workspaceId: visitorSession.widget.workspaceId,
          name,
          email: parsed.data.email,
          externalId: parsed.data.id,
          lastSeenAt: new Date(),
        },
      });

  await db.visitorSession.update({
    where: { id: visitorSession.id },
    data: {
      contactId: resolvedContact.id,
      externalId: parsed.data.id,
      lastSeenAt: new Date(),
    },
  });

  console.info("widget.visitor.identified", {
    workspaceId: visitorSession.widget.workspaceId,
    widgetId: visitorSession.widgetId,
    contactId: resolvedContact.id,
  });

  return Response.json({ ok: true });
}
