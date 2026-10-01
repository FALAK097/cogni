import { WidgetConversations } from "@/components/widget/widget-conversations";
import { SITE_NAME } from "@/lib/constants";
import { requireDashboardContext } from "@/lib/auth/dashboard-context";
import { canManageWorkspace } from "@/lib/auth/permissions";

export const metadata = {
  title: `Inbox | ${SITE_NAME}`,
  description: "View widget conversations",
};

export default async function ConversationsPage({
  searchParams,
}: {
  searchParams: Promise<{ conversationId?: string }>;
}) {
  const { membership } = await requireDashboardContext();
  const { conversationId } = await searchParams;

  return (
    <WidgetConversations
      initialConversationId={conversationId ?? null}
      canManage={canManageWorkspace(membership.role)}
    />
  );
}
