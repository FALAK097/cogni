import "server-only";

import { getCloudflareContext } from "@opennextjs/cloudflare";
import type { AiSearchInstance } from "@cloudflare/workers-types";

import { env } from "@/lib/env/server";

type CloudflareSearchMetadata = Record<string, string | number | boolean>;
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

const maxSearchTextCharacters = 3_500_000;

type CloudflareSearchEnv = {
  AI_SEARCH?: AiSearchInstance;
};

function getCloudflareSearchToken() {
  return env.CLOUDFLARE_AI_SEARCH_TOKEN ?? env.CLOUDFLARE_API_TOKEN;
}

function getCloudflareSearchBinding() {
  if (env.ENV !== "production") {
    return null;
  }

  try {
    return (getCloudflareContext().env as unknown as CloudflareSearchEnv).AI_SEARCH ?? null;
  } catch {
    return null;
  }
}

export function isCloudflareSearchConfigured() {
  return Boolean(
    getCloudflareSearchBinding() ||
    (env.CLOUDFLARE_ACCOUNT_ID && getCloudflareSearchToken() && env.SEARCH_INDEX),
  );
}

function getCloudflareSearchBaseUrl() {
  if (!env.CLOUDFLARE_ACCOUNT_ID || !env.SEARCH_INDEX) {
    return null;
  }

  const accountId = encodeURIComponent(env.CLOUDFLARE_ACCOUNT_ID);
  const instanceName = encodeURIComponent(env.SEARCH_INDEX);
  return `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai-search/instances/${instanceName}`;
}

export async function uploadCloudflareSearchDocument({
  documentId,
  workspaceId,
  title,
  text,
}: {
  documentId: string;
  workspaceId: string;
  title: string;
  text: string;
}) {
  if (!isCloudflareSearchConfigured()) {
    return;
  }

  const indexedText = text.slice(0, maxSearchTextCharacters);
  const metadata: CloudflareSearchMetadata = {
    documentid: documentId,
    workspaceid: workspaceId,
    title,
  };

  const searchBinding = getCloudflareSearchBinding();
  if (searchBinding) {
    await searchBinding.items.uploadAndPoll(`${documentId}.txt`, indexedText, {
      metadata,
      timeoutMs: 60_000,
    });
    return;
  }

  const token = getCloudflareSearchToken();
  const baseUrl = getCloudflareSearchBaseUrl();
  if (!token || !baseUrl) {
    return;
  }

  const formData = new FormData();
  formData.set("file", new Blob([indexedText], { type: "text/plain" }), `${documentId}.txt`);
  formData.set("metadata", JSON.stringify(metadata));
  formData.set("wait_for_completion", "true");

  const response = await fetch(`${baseUrl}/items`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: formData,
  });

  if (!response.ok) {
    throw new Error("Could not index document in Cloudflare AI Search.");
  }
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
      filters,
    },
  };
  const searchBinding = getCloudflareSearchBinding();
  if (searchBinding) {
    const response = await searchBinding.search({
      query,
      ai_search_options: searchOptions,
    });

    return response.chunks ?? [];
  }

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

  const payload = (await response.json()) as {
    result?: { chunks?: CloudflareSearchChunk[] };
  };

  return payload.result?.chunks ?? [];
}
