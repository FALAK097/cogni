import "server-only";

import { env } from "@/lib/env/server";

export function isCloudflareSearchConfigured() {
  return Boolean(env.CLOUDFLARE_ACCOUNT_ID && env.CLOUDFLARE_API_TOKEN && env.SEARCH_INDEX);
}

export async function searchCloudflareIndex({
  query,
  limit = 10,
}: {
  query: string;
  limit?: number;
}) {
  if (
    !isCloudflareSearchConfigured() ||
    !env.CLOUDFLARE_ACCOUNT_ID ||
    !env.CLOUDFLARE_API_TOKEN ||
    !env.SEARCH_INDEX
  ) {
    return [];
  }

  const response = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${env.CLOUDFLARE_ACCOUNT_ID}/ai/search/indexes/${env.SEARCH_INDEX}/query`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.CLOUDFLARE_API_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ query, topK: limit }),
    },
  );

  if (!response.ok) {
    return [];
  }

  const payload = (await response.json()) as {
    result?: { matches?: { id: string; score: number; metadata?: Record<string, string> }[] };
  };

  return payload.result?.matches ?? [];
}
