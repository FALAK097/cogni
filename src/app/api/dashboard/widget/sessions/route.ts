import { NextResponse } from "next/server";
import { eq, and, or, like, count } from "drizzle-orm";
import { requireDashboardContext } from "@/lib/auth/dashboard-context";
import { ensureWorkspaceWidget } from "@/features/widget/server/widget-service";
import { getDashboardEngagedVisitorSessionCond } from "@/features/widget/server/widget-data-filters";
import type { MessageJson } from "@/features/conversations/server/conversation-service";
import { visitorSession as visitorSessionTable } from "@/lib/db/schema";

export async function GET(request: Request) {
  const { db, workspace } = await requireDashboardContext();
  const widget = await ensureWorkspaceWidget(db, workspace.id);
  const { searchParams } = new URL(request.url);

  const page = Number(searchParams.get("page") ?? "1");
  const limit = Number(searchParams.get("limit") ?? "20");
  const search = searchParams.get("search")?.trim();
  const status = searchParams.get("status");

  const getWhereClause = (fields: any, { eq, and, or, like }: any) => {
    const conds = [
      eq(fields.widgetId, widget.id),
      getDashboardEngagedVisitorSessionCond(fields as any),
    ];
    if (status && status !== "all") {
      conds.push(eq(fields.status, status));
    }
    if (search) {
      conds.push(
        or(
          like(fields.visitorId, `%${search}%`),
          like(fields.hostname, `%${search}%`),
          like(fields.country, `%${search}%`),
          like(fields.city, `%${search}%`),
        ),
      );
    }
    return and(...conds);
  };

  const [totalResult, sessions] = await Promise.all([
    (db as any)
      .select({ val: count() })
      .from(visitorSessionTable)
      .where(getWhereClause(visitorSessionTable, { eq, and, or, like })),
    db.query.visitorSession.findMany({
      where: (fields, ops) => getWhereClause(fields, ops),
      orderBy: (fields, { desc }) => [desc(fields.lastSeenAt)],
      offset: (page - 1) * limit,
      limit,
      with: {
        contact: true,
        conversations: {
          where: (fields, { eq, and, like }) =>
            and(eq(fields.channel, "WIDGET"), like(fields.messages, '%"authorType":"VISITOR"%')),
          orderBy: (fields, { desc }) => [desc(fields.lastMessageAt)],
          limit: 1,
        },
      },
    }),
  ]);
  const total = totalResult[0]?.val ?? 0;

  return NextResponse.json({
    sessions: sessions.map((session: any) => {
      const convo = session.conversations[0];
      const list = convo ? (JSON.parse(convo.messages || "[]") as MessageJson[]) : [];
      const publicMessages = list.filter(
        (message) => message.visibility === "PUBLIC" || !message.visibility,
      );
      const last = publicMessages[publicMessages.length - 1];

      return {
        id: session.id,
        visitorId: session.visitorId,
        status: session.status,
        messageCount: session.messageCount,
        country: session.country,
        city: session.city,
        deviceType: session.deviceType,
        browser: session.browser,
        os: session.os,
        hostname: session.hostname,
        lastActivityAt: session.lastSeenAt
          ? new Date(session.lastSeenAt).toISOString()
          : new Date().toISOString(),
        createdAt: session.createdAt
          ? new Date(session.createdAt).toISOString()
          : new Date().toISOString(),
        contactName: session.name ?? session.contact?.name ?? "Visitor",
        contactEmail: session.email ?? session.contact?.email,
        preview: last?.body ?? convo?.subject ?? "No messages yet",
        messages: last ? [{ content: last.body }] : [],
        ipData: session.ipData ? JSON.parse(session.ipData) : null,
        _count: { messages: session.messageCount },
      };
    }),
    pagination: {
      page,
      limit,
      total,
      pages: Math.max(1, Math.ceil(total / limit)),
    },
  });
}
