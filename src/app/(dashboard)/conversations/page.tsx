import { WidgetConversations } from "@/components/widget/widget-conversations";
import { SITE_NAME } from "@/lib/constants";
import { requireDashboardContext } from "@/lib/auth/dashboard-context";

export const metadata = {
  title: `Inbox | ${SITE_NAME}`,
  description: "View widget conversations",
};

export default async function ConversationsPage() {
  await requireDashboardContext();

  return <WidgetConversations />;
}
