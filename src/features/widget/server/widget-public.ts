import "server-only";

import type { Db } from "@/lib/db/client";

import {
  getPublicWidget,
  toWidgetPublicConfig,
  validateEmbedOrigin,
} from "@/features/widget/server/widget-service";
import { getRequestOrigin } from "@/features/widget/server/widget-utils";

export async function assertPublicWidgetAccess(
  db: Db,
  publicKey: string,
  request: Request,
  options?: { preview?: boolean },
) {
  const widget = await getPublicWidget(db, publicKey);
  if (!widget || !widget.isEnabled) {
    return { error: Response.json({ error: "Widget is unavailable." }, { status: 404 }) };
  }

  const origin = getRequestOrigin(request);
  const allowedDomains = JSON.parse(widget.authorizedDomains || "[]") as string[];

  if (!options?.preview && !validateEmbedOrigin(origin, allowedDomains)) {
    return { error: Response.json({ error: "This domain is not authorized." }, { status: 403 }) };
  }

  return {
    widget,
    config: toWidgetPublicConfig(widget),
    origin,
    allowedDomains,
  };
}

export function bearerToken(request: Request) {
  const authorization = request.headers.get("authorization");
  return authorization?.startsWith("Bearer ") ? authorization.slice(7) : null;
}

export async function requireAuthorizedVisitorSession(db: Db, publicKey: string, request: Request) {
  const token = bearerToken(request);
  if (!token) {
    return { error: Response.json({ error: "Widget session is required." }, { status: 401 }) };
  }

  const session = await getAuthorizedVisitorSession(db, publicKey, token);
  if (!session) {
    return {
      error: Response.json({ error: "Widget session is invalid or expired." }, { status: 401 }),
    };
  }

  return { session };
}

export async function getAuthorizedVisitorSession(db: Db, publicKey: string, token: string) {
  const session = await db.query.visitorSession.findFirst({
    where: (fields, { eq, and, gt }) =>
      and(eq(fields.token, token), gt(fields.expiresAt, new Date().toISOString())),
    with: {
      widget: {
        with: {
          workspace: {
            columns: { id: true, name: true },
          },
        },
      },
    },
  });

  if (
    session &&
    session.widget &&
    session.widget.publicKey === publicKey &&
    session.widget.isEnabled
  ) {
    return session;
  }

  return null;
}
