import { z } from "zod";

import {
  assertPublicWidgetAccess,
  requireAuthorizedVisitorSession,
} from "@/features/widget/server/widget-public";
import { widgetPreflightResponse, withWidgetCors } from "@/features/widget/server/widget-utils";
import { validateEmbedOrigin } from "@/features/widget/server/widget-service";
import { getDb } from "@/lib/db/client";
import { readBoundedJson } from "@/lib/http/read-bounded-json";
import { checkRateLimits, getTrustedClientIp } from "@/lib/rate-limit/shared";
import type { SQL } from "drizzle-orm";

const searchSchema = z
  .object({ searchQuery: z.string().trim().max(160).nullable().optional() })
  .strict();
const MAX_REQUEST_BYTES = 4 * 1024;

function rateLimitError(rateLimit: Awaited<ReturnType<typeof checkRateLimits>>) {
  if (rateLimit.allowed) return null;
  if (rateLimit.unavailable) {
    return Response.json({ error: "Service temporarily unavailable." }, { status: 503 });
  }
  return Response.json(
    { error: "Too many document searches. Try again shortly." },
    {
      status: 429,
      headers: { "Retry-After": String(Math.ceil(rateLimit.retryAfterMs / 1000)) },
    },
  );
}

export function OPTIONS(request: Request) {
  return widgetPreflightResponse(request);
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ publicKey: string }> },
) {
  const { publicKey } = await params;
  const db = getDb();
  const access = await assertPublicWidgetAccess(db, publicKey, request);
  if ("error" in access) return access.error;
  const withAccessCors = (response: Response) =>
    withWidgetCors(
      response,
      access.origin,
      validateEmbedOrigin(access.origin, access.allowedDomains),
    );

  const sharedLimit = await checkRateLimits([
    {
      key: `widget-public:ip:${getTrustedClientIp(request.headers)}`,
      limit: 240,
      windowMs: 60_000,
    },
    {
      key: `widget-public:workspace:${access.widget.workspaceId}`,
      limit: 1000,
      windowMs: 60_000,
    },
  ]);
  const sharedLimitError = rateLimitError(sharedLimit);
  if (sharedLimitError) return withAccessCors(sharedLimitError);

  const authorized = await requireAuthorizedVisitorSession(db, publicKey, request);
  if ("error" in authorized && authorized.error) return withAccessCors(authorized.error);

  const visitorLimit = await checkRateLimits([
    {
      key: `widget-documents:visitor:${authorized.session.token}`,
      limit: 30,
      windowMs: 60_000,
    },
  ]);
  const visitorLimitError = rateLimitError(visitorLimit);
  if (visitorLimitError) return withAccessCors(visitorLimitError);

  const parsedBody = await readBoundedJson(request, MAX_REQUEST_BYTES);
  if (!parsedBody.ok) {
    return withAccessCors(
      Response.json(
        { error: parsedBody.reason === "too-large" ? "Request is too large." : "Invalid JSON." },
        { status: parsedBody.reason === "too-large" ? 413 : 400 },
      ),
    );
  }
  const parsedQuery = searchSchema.safeParse(parsedBody.value);
  if (!parsedQuery.success) {
    return withAccessCors(
      Response.json({ error: "Invalid document search request." }, { status: 400 }),
    );
  }
  const query = parsedQuery.data.searchQuery ?? "";

  if (!access.settings.enableBrochure) {
    return withAccessCors(
      Response.json({ documents: [] }, { headers: { "Cache-Control": "private, no-store" } }),
    );
  }

  const documents = await db.query.document.findMany({
    where: (fields, { eq, and, or, like }) => {
      const conds: SQL[] = [
        eq(fields.workspaceId, access.widget.workspaceId),
        eq(fields.status, "READY"),
      ];
      if (query) {
        const searchCond = or(
          like(fields.title, `%${query}%`),
          like(fields.sourceUrl, `%${query}%`),
        );
        if (searchCond) {
          conds.push(searchCond);
        }
      }
      return and(...conds);
    },
    orderBy: (fields, { desc }) => [desc(fields.updatedAt)],
    limit: 10,
    columns: {
      id: true,
      title: true,
      sourceUrl: true,
      mimeType: true,
    },
  });

  return withAccessCors(
    Response.json(
      {
        documents: documents.map((document) => ({
          id: document.id,
          title: document.title,
          url: document.sourceUrl,
          mimeType: document.mimeType,
        })),
      },
      { headers: { "Cache-Control": "private, no-store" } },
    ),
  );
}
