import { redirect } from "next/navigation";
import { agentHref } from "@/features/navigation/app-routes";

export default async function KnowledgeBasePage() {
  redirect(agentHref("build", "knowledge"));
}
