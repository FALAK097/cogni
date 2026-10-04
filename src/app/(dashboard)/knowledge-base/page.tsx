import { SITE_NAME } from "@/lib/constants";
import { redirect } from "next/navigation";
import { agentHref } from "@/features/navigation/app-routes";

export const metadata = {
  title: `Agent | ${SITE_NAME}`,
  description: "Manage your agent's knowledge sources.",
};

export default async function KnowledgeBasePage() {
  redirect(agentHref("build", "knowledge"));
}
