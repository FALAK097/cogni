import "server-only";

import type { PrismaClient } from "@/generated/prisma/client";

import {
  getPublicWidget,
  isHostnameAuthorized,
  toEchoPublicConfig,
  validateEmbedOrigin,
} from "@/features/widget/server/widget-service";
import { getRequestOrigin } from "@/features/widget/server/echo-utils";

export async function assertPublicWidgetAccess(
  db: PrismaClient,
  publicKey: string,
  request: Request,
  options?: { preview?: boolean; hostname?: string },
) {
  const widget = await getPublicWidget(db, publicKey);
  if (!widget || !widget.isEnabled) {
    return { error: Response.json({ error: "Widget is unavailable." }, { status: 404 }) };
  }

  const origin = getRequestOrigin(request);
  const allowedDomains = widget.authorizedDomains.map((domain) => domain.hostname);

  if (!options?.preview && !validateEmbedOrigin(origin, allowedDomains)) {
    const hostname = options?.hostname?.toLowerCase().replace(/\.$/, "");
    if (!hostname || !isHostnameAuthorized(hostname, widget.authorizedDomains)) {
      return { error: Response.json({ error: "This domain is not authorized." }, { status: 403 }) };
    }
  }

  return {
    widget,
    config: toEchoPublicConfig(widget),
    origin,
    allowedDomains,
  };
}

export async function getVisitorSessionByDbId(
  db: PrismaClient,
  sessionDbId: string,
  widgetId: string,
) {
  return db.visitorSession.findFirst({
    where: {
      id: sessionDbId,
      widgetId,
      expiresAt: { gt: new Date() },
    },
  });
}

export function bearerToken(request: Request) {
  const authorization = request.headers.get("authorization");
  return authorization?.startsWith("Bearer ") ? authorization.slice(7) : null;
}

export async function requireAuthorizedVisitorSession(
  db: PrismaClient,
  publicKey: string,
  request: Request,
) {
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

export async function getAuthorizedVisitorSession(
  db: PrismaClient,
  publicKey: string,
  token: string,
) {
  return db.visitorSession.findFirst({
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
        include: {
          authorizedDomains: true,
          workspace: {
            select: { id: true, name: true },
          },
        },
      },
    },
  });
}
