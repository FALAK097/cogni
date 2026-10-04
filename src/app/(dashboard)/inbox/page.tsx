import { WidgetConversations } from "@/components/widget/widget-conversations";
import { requireDashboardContext } from "@/lib/auth/dashboard-context";
import { canManageWorkspace } from "@/lib/auth/permissions";
import { SITE_NAME } from "@/lib/constants";
import { APP_PAGES } from "@/features/navigation/app-routes";

export const metadata = {
  title: `${APP_PAGES.inbox.label} | ${SITE_NAME}`,
  description: APP_PAGES.inbox.description,
};

export default async function InboxPage({
  searchParams,
}: {
  searchParams: Promise<{ conversationId?: string }>;
}) {
  const [{ membership }, { conversationId }] = await Promise.all([
    requireDashboardContext(),
    searchParams,
  ]);

  return (
    <WidgetConversations
      initialConversationId={conversationId ?? null}
      canManage={canManageWorkspace(membership.role)}
    />
  );
}
