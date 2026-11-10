type SearchItemResponse = {
  success?: boolean;
  result?: { id?: string; key?: string };
};

type SearchItemListResponse = {
  success?: boolean;
  result?: Array<{ id?: string; key?: string }>;
};

export function createCloudflareSearchClient({
  baseUrl,
  token,
  fetcher = fetch,
}: {
  baseUrl: string;
  token: string;
  fetcher?: typeof fetch;
}) {
  const headers = { Authorization: `Bearer ${token}` };

  async function deleteItem(itemId: string) {
    const response = await fetcher(`${baseUrl}/items/${encodeURIComponent(itemId)}`, {
      method: "DELETE",
      headers,
      signal: AbortSignal.timeout(10_000),
    });
    if (response.status === 404) return;
    if (!response.ok) throw new Error("Could not delete document from Cloudflare AI Search.");
    const payload = (await response.json().catch(() => null)) as { success?: boolean } | null;
    if (!payload?.success) throw new Error("Cloudflare AI Search did not confirm item deletion.");
  }

  async function listItemsByKey(itemKey: string) {
    const url = new URL(`${baseUrl}/items`);
    url.searchParams.set("key", itemKey);
    url.searchParams.set("source", "builtin");
    const response = await fetcher(url, {
      method: "GET",
      headers,
      signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok) throw new Error("Could not list Cloudflare AI Search items.");
    const payload = (await response.json().catch(() => null)) as SearchItemListResponse | null;
    if (!payload?.success || !Array.isArray(payload.result)) {
      throw new Error("Cloudflare AI Search returned an invalid item list.");
    }
    return payload.result.flatMap((item) =>
      typeof item.id === "string" && item.key === itemKey ? [item.id] : [],
    );
  }

  return {
    async uploadDocument({
      documentId,
      workspaceId,
      title,
      text,
      itemKey,
    }: {
      documentId: string;
      workspaceId: string;
      title: string;
      text: string;
      itemKey: string;
    }) {
      const formData = new FormData();
      formData.set("file", new Blob([text], { type: "text/plain" }), itemKey);
      formData.set(
        "metadata",
        JSON.stringify({ documentid: documentId, workspaceid: workspaceId, title }),
      );
      formData.set("wait_for_completion", "true");

      const response = await fetcher(`${baseUrl}/items`, {
        method: "POST",
        headers,
        body: formData,
        signal: AbortSignal.timeout(30_000),
      });
      if (!response.ok) throw new Error("Could not index document in Cloudflare AI Search.");

      const payload = (await response.json().catch(() => null)) as SearchItemResponse | null;
      if (!payload?.success || !payload.result?.id) {
        throw new Error("Cloudflare AI Search did not return an item identity.");
      }
      return payload.result.id;
    },
    deleteItem,
    listItemsByKey,
    async deleteItemsByKey(itemKey: string) {
      const itemIds = await listItemsByKey(itemKey);
      await Promise.all(itemIds.map((itemId) => deleteItem(itemId)));
    },
  };
}
