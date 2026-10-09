import "server-only";

import { and, eq, ne, gt, like, sql } from "drizzle-orm";
import {
  conversation as conversationTable,
  visitorSession as visitorSessionTable,
} from "@/lib/db/schema";

export function getHasWidgetConversationCond(
  s: Pick<typeof visitorSessionTable, "id">,
  requireVisitorMessage = true,
) {
  const visitorMessageCond = requireVisitorMessage
    ? sql`and "engaged_conversation"."messages" like '%"authorType":"VISITOR"%'`
    : sql.empty();

  return sql`exists (
    select 1 from "conversation" as "engaged_conversation"
    where "engaged_conversation"."visitorSessionId" = ${s.id}
      and "engaged_conversation"."channel" = 'WIDGET'
      ${visitorMessageCond}
  )`;
}

export function getEngagedVisitorSessionCond(
  s: Pick<typeof visitorSessionTable, "id" | "messageCount" | "hostname">,
) {
  return and(
    ne(s.hostname, "dashboard-preview"),
    gt(s.messageCount, 0),
    getHasWidgetConversationCond(s),
  );
}

/** Dashboard inbox hides dashboard preview chats. */
export function getDashboardEngagedVisitorSessionCond(
  s: Pick<typeof visitorSessionTable, "id" | "messageCount" | "hostname">,
) {
  return and(
    ne(s.hostname, "dashboard-preview"),
    gt(s.messageCount, 0),
    getHasWidgetConversationCond(s),
  );
}

export function getWidgetConversationCond(
  c: Pick<typeof conversationTable, "workspaceId" | "channel" | "messages" | "visitorSessionId">,
  workspaceId: string,
) {
  return and(
    eq(c.workspaceId, workspaceId),
    eq(c.channel, "WIDGET"),
    like(c.messages, '%"authorType":"VISITOR"%'),
    sql`exists (
      select 1 from "visitor_session" as "engaged_visitor_session"
      where "engaged_visitor_session"."id" = ${c.visitorSessionId}
        and "engaged_visitor_session"."hostname" != 'dashboard-preview'
        and "engaged_visitor_session"."messageCount" > 0
    )`,
  );
}
