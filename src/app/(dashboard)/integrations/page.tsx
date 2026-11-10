import { redirect } from "next/navigation";

import { APP_ROUTES, queryStringFromSearchParams } from "@/features/navigation/app-routes";

export default async function LegacyIntegrationsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const query = queryStringFromSearchParams(await searchParams);
  redirect(`${APP_ROUTES.settings}${query ? `?${query}` : ""}`);
}
