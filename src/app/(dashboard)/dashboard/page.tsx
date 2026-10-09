import { redirect } from "next/navigation";

import { APP_ROUTES, queryStringFromSearchParams } from "@/features/navigation/app-routes";

export default async function LegacyDashboardPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const query = queryStringFromSearchParams(await searchParams);
  redirect(`${APP_ROUTES.insights}${query ? `?${query}` : ""}`);
}
