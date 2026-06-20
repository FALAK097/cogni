import { ContentLayout } from "@/components/app-nav/content-layout";
import { EchoConversations } from "@/components/echo/echo-conversations";
import { SITE_NAME } from "@/lib/constants";
import { requireDashboardContext } from "@/lib/auth/dashboard-context";

export const metadata = {
  title: `Conversations | ${SITE_NAME}`,
  description: "View widget conversations",
};

export default async function ConversationsPage() {
  await requireDashboardContext();

  return (
    <ContentLayout className="overflow-x-hidden">
      <div className="container mx-auto px-0">
        <EchoConversations />
      </div>
    </ContentLayout>
  );
}
