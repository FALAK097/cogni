import { redirect } from "next/navigation";

import { queryStringFromSearchParams, APP_ROUTES } from "@/features/navigation/app-routes";

export default async function LegacyConversationsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const query = queryStringFromSearchParams(await searchParams);
  redirect(`${APP_ROUTES.inbox}${query ? `?${query}` : ""}`);
}
