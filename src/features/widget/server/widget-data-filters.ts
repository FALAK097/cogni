import "server-only";

import { and, eq, ne, gt, like, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import {
  conversation as conversationTable,
  visitorSession as visitorSessionTable,
} from "@/lib/db/schema";

const engagedConversationTable = alias(conversationTable, "engaged_conversation");
const engagedVisitorSessionTable = alias(visitorSessionTable, "engaged_visitor_session");

export function getHasWidgetConversationCond(
  s: Pick<typeof visitorSessionTable, "id">,
  requireVisitorMessage = true,
) {
  const visitorMessageCond = requireVisitorMessage
    ? sql`and ${engagedConversationTable.messages} like '%"authorType":"VISITOR"%'`
    : sql.empty();

  return sql`exists (
    select 1 from ${engagedConversationTable}
    where ${engagedConversationTable.visitorSessionId} = ${s.id}
      and ${engagedConversationTable.channel} = 'WIDGET'
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

/** Dashboard inbox lists every engaged session, including dashboard preview chats. */
export function getDashboardEngagedVisitorSessionCond(
  s: Pick<typeof visitorSessionTable, "id" | "messageCount">,
) {
  return and(gt(s.messageCount, 0), getHasWidgetConversationCond(s));
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
      select 1 from ${engagedVisitorSessionTable}
      where ${engagedVisitorSessionTable.id} = ${c.visitorSessionId}
        and ${engagedVisitorSessionTable.hostname} != 'dashboard-preview'
        and ${engagedVisitorSessionTable.messageCount} > 0
    )`,
  );
}
