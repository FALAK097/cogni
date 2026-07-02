"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { and, eq } from "drizzle-orm";

import { requireDashboardContext } from "@/lib/auth/dashboard-context";
import { widget as widgetTable } from "@/lib/db/schema";

export async function enterAgentAction(formData: FormData) {
  const widgetId = formData.get("widgetId");
  if (typeof widgetId !== "string" || !widgetId) {
    redirect("/agents");
  }

  const { db, workspace } = await requireDashboardContext();

  const record = await db.query.widget.findFirst({
    where: and(eq(widgetTable.id, widgetId), eq(widgetTable.workspaceId, workspace.id)),
  });

  if (!record) {
    redirect("/agents");
  }

  const cookieStore = await cookies();
  cookieStore.set("active_widget_id", record.id, {
    httpOnly: true,
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 365,
  });

  redirect("/backstage");
}
