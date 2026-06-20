import "server-only";

import { env } from "@/lib/env/server";

export function isVectorizeConfigured() {
  return Boolean(env.CLOUDFLARE_ACCOUNT_ID && env.CLOUDFLARE_API_TOKEN && env.VECTORIZE_INDEX);
}

export async function upsertVectorizeVectors(
  vectors: {
    id: string;
    values: number[];
    metadata?: Record<string, string | number | boolean>;
  }[],
) {
  if (
    !isVectorizeConfigured() ||
    !env.CLOUDFLARE_ACCOUNT_ID ||
    !env.CLOUDFLARE_API_TOKEN ||
    !env.VECTORIZE_INDEX
  ) {
    return;
  }

  await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${env.CLOUDFLARE_ACCOUNT_ID}/vectorize/v2/indexes/${env.VECTORIZE_INDEX}/upsert`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.CLOUDFLARE_API_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ vectors }),
    },
  );
}

export async function queryVectorize({
  vector,
  topK = 4,
  filter,
}: {
  vector: number[];
  topK?: number;
  filter?: Record<string, string | number | boolean>;
}) {
  if (
    !isVectorizeConfigured() ||
    !env.CLOUDFLARE_ACCOUNT_ID ||
    !env.CLOUDFLARE_API_TOKEN ||
    !env.VECTORIZE_INDEX
  ) {
    return [];
  }

  const response = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${env.CLOUDFLARE_ACCOUNT_ID}/vectorize/v2/indexes/${env.VECTORIZE_INDEX}/query`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.CLOUDFLARE_API_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        vector,
        topK,
        returnMetadata: true,
        filter,
      }),
    },
  );

  if (!response.ok) {
    return [];
  }

  const payload = (await response.json()) as {
    result?: {
      matches?: {
        id: string;
        score: number;
        metadata?: Record<string, string>;
      }[];
    };
  };

  return payload.result?.matches ?? [];
}
