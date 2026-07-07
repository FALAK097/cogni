import {
  getRequestOrigin,
  widgetPreflightResponse,
  withWidgetCors,
} from "@/features/widget/server/widget-utils";
import {
  getPublicWidget,
  toWidgetPublicConfig,
  validateEmbedOrigin,
} from "@/features/widget/server/widget-service";
import { getDb } from "@/lib/db/client";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ publicKey: string }> },
) {
  const { publicKey } = await params;
  const db = getDb();
  const widget = await getPublicWidget(db, publicKey);

  if (!widget || !widget.isEnabled) {
    return Response.json({ error: "Widget is unavailable." }, { status: 404 });
  }

  const origin = getRequestOrigin(request);
  const allowedDomains = JSON.parse(widget.authorizedDomains || "[]") as string[];
  const allowed = validateEmbedOrigin(origin, allowedDomains);
  if (!allowed) {
    return Response.json({ error: "This domain is not authorized." }, { status: 403 });
  }

  const config = toWidgetPublicConfig(widget);

  return withWidgetCors(Response.json(config), origin, allowed);
}

export async function OPTIONS(request: Request) {
  return widgetPreflightResponse(request);
}
