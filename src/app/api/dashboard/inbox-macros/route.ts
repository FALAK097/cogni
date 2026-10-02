import { NextResponse } from "next/server";

import { inboxMacroInputSchema } from "@/features/conversations/macro-input";
import {
  createInboxMacro,
  InboxMacroNameConflictError,
  listInboxMacros,
} from "@/features/conversations/server/macros";
import { requireDashboardContext } from "@/lib/auth/dashboard-context";

export async function GET() {
  const { workspace } = await requireDashboardContext();
  const macros = await listInboxMacros(workspace.id);
  return NextResponse.json({ macros });
}

export async function POST(request: Request) {
  const { workspace, membership } = await requireDashboardContext();
  const body: unknown = await request.json().catch(() => null);
  const parsed = inboxMacroInputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Saved reply details are invalid." }, { status: 400 });
  }

  try {
    const macro = await createInboxMacro(workspace.id, membership.id, parsed.data);
    return NextResponse.json({ macro }, { status: 201 });
  } catch (error) {
    if (error instanceof InboxMacroNameConflictError) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }
    throw error;
  }
}
