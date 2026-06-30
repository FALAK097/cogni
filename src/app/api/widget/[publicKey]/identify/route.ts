import { z } from "zod";
import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { checkRateLimit } from "@/lib/rate-limit/memory";
import { visitorSession as visitorSessionTable } from "@/lib/db/schema";

const identifySchema = z.object({
  name: z.string().trim().min(1).max(100).optional(),
  email: z.string().email().max(254).optional(),
  phone: z.string().trim().min(3).max(30).optional(),
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
  if (!parsed.success || (!parsed.data.name && !parsed.data.email && !parsed.data.phone)) {
    return Response.json({ error: "Provide at least a name, email, or phone." }, { status: 400 });
  }

  const { publicKey } = await params;
  const db = getDb();
  const nowIso = new Date().toISOString();

  const visitorSession = await db.query.visitorSession.findFirst({
    where: (fields, { eq, and, gt }) => and(eq(fields.token, token), gt(fields.expiresAt, nowIso)),
    with: { widget: true },
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
    limit: 10,
    windowMs: 60_000,
  });

  if (!rateLimit.allowed) {
    return Response.json({ error: "Too many requests. Try again shortly." }, { status: 429 });
  }

  const updates: Record<string, string> = { updatedAt: nowIso };
  if (parsed.data.name) updates.name = parsed.data.name;
  if (parsed.data.email) updates.email = parsed.data.email;
  if (parsed.data.phone) updates.phone = parsed.data.phone;
  if (!visitorSession.leadCapturedAt) updates.leadCapturedAt = nowIso;

  await db
    .update(visitorSessionTable)
    .set(updates)
    .where(eq(visitorSessionTable.id, visitorSession.id));

  return Response.json({ ok: true });
}
