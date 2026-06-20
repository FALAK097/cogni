import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";

import { requireDashboardContext } from "@/lib/auth/dashboard-context";

const switchSchema = z.object({
  workspaceId: z.string().min(1),
});

export async function POST(request: Request) {
  await requireDashboardContext();
  const body = switchSchema.safeParse(await request.json());

  if (!body.success) {
    return NextResponse.json({ error: "Invalid workspace id." }, { status: 400 });
  }

  const cookieStore = await cookies();
  cookieStore.set("active_workspace_id", body.data.workspaceId, {
    httpOnly: true,
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 365,
  });

  return NextResponse.json({ ok: true });
}
