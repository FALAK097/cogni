import assert from "node:assert/strict";
import { unlink } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { createRequire } from "node:module";
import { test } from "node:test";

const require = createRequire(import.meta.url);
const { build } = require("esbuild");
const outputFile = join(tmpdir(), `cogni-cloudflare-search-items-${process.pid}.mjs`);

await build({
  entryPoints: ["src/lib/search/cloudflare-search-client.ts"],
  outfile: outputFile,
  bundle: true,
  platform: "node",
  format: "esm",
});

const { createCloudflareSearchClient } = await import(pathToFileURL(outputFile).href);

test("Cloudflare item uploads return only the provider identity and preserve deterministic keys", async () => {
  const calls = [];
  const client = createCloudflareSearchClient({
    baseUrl: "https://api.cloudflare.test/instances/cogni",
    token: "test-token",
    fetcher: async (input, init) => {
      calls.push({ input: new URL(input), init });
      return Response.json({
        success: true,
        result: { id: "provider-item-1", key: "source.rev.txt" },
      });
    },
  });

  const itemId = await client.uploadDocument({
    documentId: "source",
    workspaceId: "workspace",
    title: "Private title",
    text: "Private source text",
    itemKey: "source.rev.txt",
  });

  assert.equal(itemId, "provider-item-1");
  assert.equal(calls[0].input.pathname.endsWith("/items"), true);
  assert.equal(calls[0].init.method, "POST");
  const body = calls[0].init.body;
  assert.equal(body.get("file").name, "source.rev.txt");
  assert.equal(body.get("metadata").includes("Private source text"), false);
  assert.equal(body.get("metadata").includes("workspace"), true);
});

test("cleanup deletes a known item and removes only exact built-in item keys", async () => {
  const calls = [];
  const client = createCloudflareSearchClient({
    baseUrl: "https://api.cloudflare.test/instances/cogni",
    token: "test-token",
    fetcher: async (input, init) => {
      const url = new URL(input);
      calls.push({ url, init });
      if (init.method === "GET") {
        return Response.json({
          success: true,
          result: [
            { id: "item-one", key: "source.rev.txt" },
            { id: "item-other", key: "another-source.txt" },
          ],
        });
      }
      return Response.json({ success: true, result: { key: "source.rev.txt" } });
    },
  });

  await client.deleteItem("item-one");
  await client.deleteItemsByKey("source.rev.txt");

  assert.equal(calls[0].init.method, "DELETE");
  assert.equal(calls[0].url.pathname.endsWith("/items/item-one"), true);
  assert.equal(calls[1].url.searchParams.get("key"), "source.rev.txt");
  assert.equal(calls[1].url.searchParams.get("source"), "builtin");
  assert.equal(calls[2].url.pathname.endsWith("/items/item-one"), true);
  assert.equal(calls.length, 3);
});

test("cleanup treats an already absent item as complete and rejects provider failures", async () => {
  const missing = createCloudflareSearchClient({
    baseUrl: "https://api.cloudflare.test/instances/cogni",
    token: "test-token",
    fetcher: async () => new Response(null, { status: 404 }),
  });
  await missing.deleteItem("already-deleted");

  const failing = createCloudflareSearchClient({
    baseUrl: "https://api.cloudflare.test/instances/cogni",
    token: "test-token",
    fetcher: async () => new Response("{}", { status: 503 }),
  });
  await assert.rejects(failing.deleteItem("item-fails"), /Could not delete document/);
});

test("upload fails closed when Cloudflare omits the item identity", async () => {
  const client = createCloudflareSearchClient({
    baseUrl: "https://api.cloudflare.test/instances/cogni",
    token: "test-token",
    fetcher: async () => Response.json({ success: true, result: { key: "source.rev.txt" } }),
  });
  await assert.rejects(
    client.uploadDocument({
      documentId: "source",
      workspaceId: "workspace",
      title: "Title",
      text: "Text",
      itemKey: "source.rev.txt",
    }),
    /did not return an item identity/,
  );
});

test.after(async () => {
  await unlink(outputFile).catch(() => undefined);
});
