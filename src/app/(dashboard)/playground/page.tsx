import { redirect } from "next/navigation";

import { canonicalAgentPath } from "@/features/navigation/app-routes";

export default async function LegacyPlaygroundPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  redirect(canonicalAgentPath(await searchParams));
}
