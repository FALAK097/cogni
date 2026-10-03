import { NextResponse } from "next/server";
import { z } from "zod";

import { inboxMacroInputSchema } from "@/features/conversations/macro-input";
import {
  deleteInboxMacro,
  InboxMacroNameConflictError,
  updateInboxMacro,
} from "@/features/conversations/server/macros";
import { requireDashboardContext } from "@/lib/auth/dashboard-context";

async function getMacroId(context: { params: Promise<{ macro_id: string }> }) {
  const { macro_id: macroId } = await context.params;
  return z.string().uuid().safeParse(macroId).success ? macroId : null;
}

export async function PATCH(request: Request, context: { params: Promise<{ macro_id: string }> }) {
  const { workspace, membership } = await requireDashboardContext();
  const macroId = await getMacroId(context);
  if (!macroId) return NextResponse.json({ error: "Saved reply not found." }, { status: 404 });

  const body: unknown = await request.json().catch(() => null);
  const parsed = inboxMacroInputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Saved reply details are invalid." }, { status: 400 });
  }

  try {
    const macro = await updateInboxMacro(
      workspace.id,
      macroId,
      membership.id,
      membership.role === "OWNER",
      parsed.data,
    );
    if (!macro) return NextResponse.json({ error: "Saved reply not found." }, { status: 404 });
    return NextResponse.json({ macro });
  } catch (error) {
    if (error instanceof InboxMacroNameConflictError) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }
    throw error;
  }
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ macro_id: string }> },
) {
  const { workspace, membership } = await requireDashboardContext();
  const macroId = await getMacroId(context);
  if (!macroId) return NextResponse.json({ error: "Saved reply not found." }, { status: 404 });

  const deleted = await deleteInboxMacro(
    workspace.id,
    macroId,
    membership.id,
    membership.role === "OWNER",
  );
  if (!deleted) return NextResponse.json({ error: "Saved reply not found." }, { status: 404 });
  return NextResponse.json({ ok: true });
}
