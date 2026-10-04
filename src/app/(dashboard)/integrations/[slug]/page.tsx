import { redirect } from "next/navigation";

import { APP_ROUTES } from "@/features/navigation/app-routes";

export default async function LegacyIntegrationDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  redirect(`${APP_ROUTES.settings}/connections/${encodeURIComponent(slug)}`);
}
