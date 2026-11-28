import "server-only";

import { and, eq, ne, gt, sql } from "drizzle-orm";
import {
  conversation as conversationTable,
  visitorSession as visitorSessionTable,
} from "@/lib/db/schema";

export function getHasWidgetConversationCond(
  s: Pick<typeof visitorSessionTable, "id">,
  requireVisitorMessage = true,
) {
  const visitorMessageCond = requireVisitorMessage
    ? sql`and exists (
        select 1
        from json_each(case when json_valid("engaged_conversation"."messages") and json_type("engaged_conversation"."messages") = 'array' then "engaged_conversation"."messages" else '[]' end) as msg
        where json_extract(msg.value, '$.authorType') = 'VISITOR'
      )`
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
    sql`exists (
      select 1
      from json_each(case when json_valid(${c.messages}) and json_type(${c.messages}) = 'array' then ${c.messages} else '[]' end) as msg
      where json_extract(msg.value, '$.authorType') = 'VISITOR'
    )`,
    sql`exists (
      select 1 from "visitor_session" as "engaged_visitor_session"
      where "engaged_visitor_session"."id" = ${c.visitorSessionId}
        and "engaged_visitor_session"."hostname" != 'dashboard-preview'
        and "engaged_visitor_session"."messageCount" > 0
    )`,
  );
}
