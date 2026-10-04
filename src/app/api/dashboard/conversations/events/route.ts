import { and, asc, desc, eq, gt } from "drizzle-orm";
import { NextResponse } from "next/server";

import { requireDashboardContext } from "@/lib/auth/dashboard-context";
import { conversationEvent } from "@/lib/db/schema";

const maxCursor = BigInt("9223372036854775807");
const cursorPattern = /^(0|[1-9]\d{0,18})$/;
const responseHeaders = { "Cache-Control": "private, no-store, max-age=0" };

function parseCursor(value: string | null) {
  if (value === null) return { ok: true as const, value: null };
  if (!cursorPattern.test(value)) return { ok: false as const };
  const cursor = BigInt(value);
  if (cursor > maxCursor) return { ok: false as const };
  return { ok: true as const, value: cursor };
}

export async function GET(request: Request) {
  const { db, workspace } = await requireDashboardContext();
  const searchParams = new URL(request.url).searchParams;
  if (searchParams.getAll("after").length > 1) {
    return NextResponse.json(
      { error: "Invalid event cursor." },
      { status: 400, headers: responseHeaders },
    );
  }

  const parsedCursor = parseCursor(searchParams.get("after"));
  if (!parsedCursor.ok) {
    return NextResponse.json(
      { error: "Invalid event cursor." },
      { status: 400, headers: responseHeaders },
    );
  }

  const [latestRows, oldestRows] = await Promise.all([
    db
      .select({ cursor: conversationEvent.cursor })
      .from(conversationEvent)
      .where(eq(conversationEvent.workspaceId, workspace.id))
      .orderBy(desc(conversationEvent.cursor))
      .limit(1),
    db
      .select({ cursor: conversationEvent.cursor })
      .from(conversationEvent)
      .where(eq(conversationEvent.workspaceId, workspace.id))
      .orderBy(asc(conversationEvent.cursor))
      .limit(1),
  ]);
  const latestCursor = latestRows[0]?.cursor ?? BigInt(0);
  const oldestCursor = oldestRows[0]?.cursor ?? null;
  const afterCursor = parsedCursor.value;
  const hasGap =
    afterCursor !== null && oldestCursor !== null && afterCursor < oldestCursor - BigInt(1);

  if (afterCursor === null || hasGap) {
    return NextResponse.json(
      { events: [], cursor: latestCursor.toString(), reset: true },
      { headers: responseHeaders },
    );
  }

  const events = await db
    .select({ cursor: conversationEvent.cursor, conversationId: conversationEvent.conversationId })
    .from(conversationEvent)
    .where(
      and(
        eq(conversationEvent.workspaceId, workspace.id),
        gt(conversationEvent.cursor, afterCursor),
      ),
    )
    .orderBy(asc(conversationEvent.cursor))
    .limit(100);

  const cursor = events.at(-1)?.cursor ?? afterCursor;
  return NextResponse.json(
    {
      events: events.map((event) => ({
        cursor: event.cursor.toString(),
        conversationId: event.conversationId,
      })),
      cursor: cursor.toString(),
      reset: false,
    },
    { headers: responseHeaders },
  );
}
