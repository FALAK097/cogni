import { NextResponse } from "next/server";
import { eq, and, or, count, sql } from "drizzle-orm";
import { requireDashboardContext } from "@/lib/auth/dashboard-context";
import { escapeLikePattern } from "@/lib/db/utils";
import { ensureWorkspaceWidget } from "@/features/widget/server/widget-service";
import { getDashboardEngagedVisitorSessionCond } from "@/features/widget/server/widget-data-filters";
import type { MessageJson } from "@/features/conversations/server/conversation-service";
import { visitorSession as visitorSessionTable } from "@/lib/db/schema";

export async function GET(request: Request) {
  const { db, workspace } = await requireDashboardContext();
  const widget = await ensureWorkspaceWidget(db, workspace.id);
  const { searchParams } = new URL(request.url);

  const rawPage = Number(searchParams.get("page") ?? "1");
  const rawLimit = Number(searchParams.get("limit") ?? "20");
  const page = Number.isFinite(rawPage) ? Math.max(1, Math.trunc(rawPage)) : 1;
  const limit = Number.isFinite(rawLimit) ? Math.max(1, Math.min(100, Math.trunc(rawLimit))) : 20;
  const search = searchParams.get("search")?.trim();
  const status = searchParams.get("status");

  const conditions = [
    eq(visitorSessionTable.widgetId, widget.id),
    getDashboardEngagedVisitorSessionCond(visitorSessionTable),
  ];
  if (status && status !== "all") {
    conditions.push(eq(visitorSessionTable.status, status));
  }
  if (search) {
    const pattern = `%${escapeLikePattern(search)}%`;
    const searchCond = or(
      sql`${visitorSessionTable.visitorId} like ${pattern} escape '\\'`,
      sql`${visitorSessionTable.hostname} like ${pattern} escape '\\'`,
      sql`${visitorSessionTable.country} like ${pattern} escape '\\'`,
      sql`${visitorSessionTable.city} like ${pattern} escape '\\'`,
    );
    if (searchCond) {
      conditions.push(searchCond);
    }
  }
  const whereClause = and(...conditions);

  const [totalResult, sessions] = await Promise.all([
    db.select({ val: count() }).from(visitorSessionTable).where(whereClause),
    db.query.visitorSession.findMany({
      where: whereClause,
      orderBy: (fields, { desc }) => [desc(fields.lastSeenAt)],
      offset: (page - 1) * limit,
      limit,
      with: {
        contact: true,
        conversations: {
          where: (fields, { eq: eqOp, and: andOp }) =>
            andOp(
              eqOp(fields.workspaceId, workspace.id),
              eqOp(fields.channel, "WIDGET"),
              sql`exists (
                select 1
                from json_each(case when json_valid(${fields.messages}) and json_type(${fields.messages}) = 'array' then ${fields.messages} else '[]' end) as msg
                where json_extract(msg.value, '$.authorType') = 'VISITOR'
              )`,
            ),
          orderBy: (fields, { desc }) => [desc(fields.lastMessageAt)],
          limit: 1,
        },
      },
    }),
  ]);
  const total = totalResult[0]?.val ?? 0;

  return NextResponse.json({
    sessions: sessions.map((session) => {
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
