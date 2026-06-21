import "server-only";

import type { PrismaClient } from "@/generated/prisma/client";

import {
  getPublicWidget,
  toWidgetPublicConfig,
  validateEmbedOrigin,
} from "@/features/widget/server/widget-service";
import { getRequestOrigin } from "@/features/widget/server/widget-utils";

export async function assertPublicWidgetAccess(
  db: PrismaClient,
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
          workspace: {
            select: { id: true, name: true },
          },
        },
      },
    },
  });
}
