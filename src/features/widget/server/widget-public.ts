import "server-only";

import type { Db } from "@/lib/db/client";

import {
  getPublishedWidgetConfig,
  getPublicWidget,
  settingsFromPublishedConfig,
  toWidgetBookingConfig,
  toWidgetWidgetConfig,
  toWidgetPublicConfig,
  validateEmbedOrigin,
} from "@/features/widget/server/widget-service";
import { parseJsonArray } from "@/features/widget/domain";
import { getRequestOrigin } from "@/features/widget/server/widget-utils";
import { requireDashboardContext } from "@/lib/auth/dashboard-context";

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

  const publishedConfig = options?.preview ? null : await getPublishedWidgetConfig(db, widget);
  if (!options?.preview && !publishedConfig) {
    return { error: Response.json({ error: "Widget is unavailable." }, { status: 404 }) };
  }
  const settings = publishedConfig
    ? settingsFromPublishedConfig(widget, publishedConfig)
    : toWidgetWidgetConfig(widget);
  const bookingSettings = publishedConfig?.booking ?? toWidgetBookingConfig(widget);

  const origin = getRequestOrigin(request);
  const allowedDomains = parseJsonArray(widget.authorizedDomains);

  if (!options?.preview && !validateEmbedOrigin(origin, allowedDomains)) {
    return { error: Response.json({ error: "This domain is not authorized." }, { status: 403 }) };
  }

  return {
    widget,
    settings,
    bookingSettings,
    config: toWidgetPublicConfig(settings),
    origin,
    allowedDomains,
  };
}

export async function assertPreviewWidgetAccess(db: Db, publicKey: string, request: Request) {
  try {
    const { workspace } = await requireDashboardContext();
    const access = await assertPublicWidgetAccess(db, publicKey, request, { preview: true });
    if ("error" in access) return access;

    if (access.widget.workspaceId !== workspace.id) {
      return { error: Response.json({ error: "Preview access denied." }, { status: 403 }) };
    }

    return access;
  } catch {
    return { error: Response.json({ error: "Preview access denied." }, { status: 403 }) };
  }
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
    session.widget.isEnabled &&
    (await getPublishedWidgetConfig(db, session.widget)) !== null
  ) {
    return session;
  }

  return null;
}
