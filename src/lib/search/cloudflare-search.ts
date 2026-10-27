import "server-only";

import { z } from "zod";

import { env } from "@/lib/env/server";
import { createCloudflareSearchClient } from "@/lib/search/cloudflare-search-client";

type CloudflareSearchFilterValue =
  | string
  | number
  | boolean
  | {
      $in?: (string | number | boolean)[];
    };

export type CloudflareSearchFilters = Record<string, CloudflareSearchFilterValue>;

export type CloudflareSearchChunk = {
  id: string;
  score: number;
  text: string;
  item?: {
    key?: string;
    metadata?: Record<string, unknown>;
  };
};

const cloudflareSearchChunkSchema = z.object({
  id: z.string().min(1),
  score: z.number().finite(),
  text: z.string(),
  item: z
    .object({
      key: z.string().optional(),
      metadata: z.record(z.string(), z.unknown()).optional(),
    })
    .optional(),
});

const cloudflareSearchResponseSchema = z.object({
  result: z
    .object({
      chunks: z.array(z.unknown()).optional(),
    })
    .optional(),
});

const maxSearchTextCharacters = 3_500_000;

function getCloudflareSearchToken() {
  return env.CLOUDFLARE_AI_SEARCH_TOKEN ?? env.CLOUDFLARE_API_TOKEN;
}

export function isCloudflareSearchConfigured() {
  return Boolean(env.CLOUDFLARE_ACCOUNT_ID && getCloudflareSearchToken() && env.SEARCH_INDEX);
}

function getCloudflareSearchBaseUrl() {
  if (!env.CLOUDFLARE_ACCOUNT_ID || !env.SEARCH_INDEX) {
    return null;
  }

  const accountId = encodeURIComponent(env.CLOUDFLARE_ACCOUNT_ID);
  const instanceName = encodeURIComponent(env.SEARCH_INDEX);
  return `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai-search/namespaces/default/instances/${instanceName}`;
}

function getCloudflareSearchClient() {
  const token = getCloudflareSearchToken();
  const baseUrl = getCloudflareSearchBaseUrl();
  if (!token || !baseUrl) return null;
  return createCloudflareSearchClient({ baseUrl, token });
}

export async function uploadCloudflareSearchDocument({
  documentId,
  workspaceId,
  title,
  text,
  itemKey = `${documentId}.txt`,
}: {
  documentId: string;
  workspaceId: string;
  title: string;
  text: string;
  itemKey?: string;
}): Promise<string | null> {
  const client = getCloudflareSearchClient();
  if (!client) return null;
  return client.uploadDocument({
    documentId,
    workspaceId,
    title,
    text: text.slice(0, maxSearchTextCharacters),
    itemKey,
  });
}

export async function deleteCloudflareSearchItem(itemId: string) {
  const client = getCloudflareSearchClient();
  if (!client) return false;
  await client.deleteItem(itemId);
  return true;
}

export async function deleteCloudflareSearchItemsByKey(itemKey: string) {
  const client = getCloudflareSearchClient();
  if (!client) return false;
  await client.deleteItemsByKey(itemKey);
  return true;
}

export async function listCloudflareSearchItemIdsByKey(itemKey: string) {
  const client = getCloudflareSearchClient();
  if (!client) return null;
  return client.listItemsByKey(itemKey);
}

export async function searchCloudflareIndex({
  query,
  limit = 10,
  filters,
}: {
  query: string;
  limit?: number;
  filters?: CloudflareSearchFilters;
}): Promise<CloudflareSearchChunk[]> {
  if (!isCloudflareSearchConfigured()) {
    return [];
  }

  const searchOptions = {
    retrieval: {
      max_num_results: limit,
      match_threshold: 0.4,
      filters,
    },
  };
  const token = getCloudflareSearchToken();
  const baseUrl = getCloudflareSearchBaseUrl();
  if (!token || !baseUrl) {
    return [];
  }

  const response = await fetch(`${baseUrl}/search`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      query,
      ai_search_options: searchOptions,
    }),
  });

  if (!response.ok) {
    return [];
  }

  const payload = cloudflareSearchResponseSchema.safeParse(await response.json().catch(() => null));
  if (!payload.success) return [];

  return (payload.data.result?.chunks ?? []).flatMap((chunk) => {
    const parsedChunk = cloudflareSearchChunkSchema.safeParse(chunk);
    return parsedChunk.success ? [parsedChunk.data] : [];
  });
}
