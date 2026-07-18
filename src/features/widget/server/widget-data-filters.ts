import "server-only";

import { and, eq, ne, gt, like, sql } from "drizzle-orm";
import {
  conversation as conversationTable,
  visitorSession as visitorSessionTable,
} from "@/lib/db/schema";

export function getEngagedVisitorSessionCond(
  s: Pick<typeof visitorSessionTable, "id" | "messageCount" | "hostname">,
) {
  return and(
    ne(s.hostname, "dashboard-preview"),
    gt(s.messageCount, 0),
    sql`exists (
      select 1 from ${conversationTable}
      where ${conversationTable.visitorSessionId} = ${s.id}
        and ${conversationTable.channel} = 'WIDGET'
        and ${conversationTable.messages} like '%"authorType":"VISITOR"%'
    )`,
  );
}

/** Dashboard inbox lists every engaged session, including dashboard preview chats. */
export function getDashboardEngagedVisitorSessionCond(
  s: Pick<typeof visitorSessionTable, "id" | "messageCount">,
) {
  return and(
    gt(s.messageCount, 0),
    sql`exists (
      select 1 from ${conversationTable}
      where ${conversationTable.visitorSessionId} = ${s.id}
        and ${conversationTable.channel} = 'WIDGET'
        and ${conversationTable.messages} like '%"authorType":"VISITOR"%'
    )`,
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
      select 1 from ${visitorSessionTable}
      where ${visitorSessionTable.id} = ${c.visitorSessionId}
        and ${visitorSessionTable.hostname} != 'dashboard-preview'
        and ${visitorSessionTable.messageCount} > 0
    )`,
  );
}
