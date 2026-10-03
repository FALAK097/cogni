import { widgetPreflightResponse, withWidgetCors } from "@/features/widget/server/widget-utils";
import { assertPublicWidgetAccess } from "@/features/widget/server/widget-public";
import { getDb } from "@/lib/db/client";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ publicKey: string }> },
) {
  const { publicKey } = await params;
  const access = await assertPublicWidgetAccess(getDb(), publicKey, request);
  if ("error" in access) return access.error;
  return withWidgetCors(Response.json(access.config), access.origin, true);
}

export async function OPTIONS(request: Request) {
  return widgetPreflightResponse(request);
}
