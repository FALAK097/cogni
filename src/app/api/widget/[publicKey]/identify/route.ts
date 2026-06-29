import { z } from "zod";
import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { checkRateLimit } from "@/lib/rate-limit/memory";
import { contact as contactTable, visitorSession as visitorSessionTable } from "@/lib/db/schema";

const identifySchema = z.object({
  id: z.string().trim().min(1).max(200).optional(),
  name: z.string().trim().min(1).max(100).optional(),
  email: z.string().email().optional(),
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
  const nowIso = new Date().toISOString();

  const visitorSession = await db.query.visitorSession.findFirst({
    where: (fields, { eq, and, gt }) => and(eq(fields.token, token), gt(fields.expiresAt, nowIso)),
    with: {
      widget: true,
    },
  });

  if (
    !visitorSession ||
    !visitorSession.widget ||
    visitorSession.widget.publicKey !== publicKey ||
    !visitorSession.widget.isEnabled
  ) {
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

  const contact = await db.query.contact.findFirst({
    where: (fields, { eq, and, or }) => {
      const orConds = [];
      if (parsed.data.id) orConds.push(eq(fields.externalId, parsed.data.id));
      if (parsed.data.email) orConds.push(eq(fields.email, parsed.data.email));
      return and(eq(fields.workspaceId, visitorSession.widget.workspaceId), or(...orConds));
    },
  });

  const name =
    parsed.data.name ?? parsed.data.email?.split("@")[0] ?? contact?.name ?? "Website visitor";
  const now = new Date().toISOString();

  let resolvedContact;
  if (contact) {
    const results = await db
      .update(contactTable)
      .set({
        name,
        email: parsed.data.email ?? contact.email,
        externalId: parsed.data.id ?? contact.externalId,
        lastSeenAt: now,
        updatedAt: now,
      })
      .where(eq(contactTable.id, contact.id))
      .returning();
    resolvedContact = results[0];
  } else {
    const results = await db
      .insert(contactTable)
      .values({
        id: randomUUID(),
        workspaceId: visitorSession.widget.workspaceId,
        name,
        email: parsed.data.email ?? null,
        externalId: parsed.data.id ?? null,
        lastSeenAt: now,
        updatedAt: now,
      })
      .returning();
    resolvedContact = results[0];
  }

  await db
    .update(visitorSessionTable)
    .set({
      contactId: resolvedContact.id,
      externalId: parsed.data.id ?? null,
      lastSeenAt: now,
      updatedAt: now,
    })
    .where(eq(visitorSessionTable.id, visitorSession.id));

  console.info("widget.visitor.identified", {
    workspaceId: visitorSession.widget.workspaceId,
    widgetId: visitorSession.widgetId,
    contactId: resolvedContact.id,
  });

  return Response.json({ ok: true });
}
