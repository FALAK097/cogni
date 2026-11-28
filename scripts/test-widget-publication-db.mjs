import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { mkdir, rm } from "node:fs/promises";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { after, before, test } from "node:test";
import { build } from "esbuild";
import { createTempSqliteEnvironment } from "./sqlite-test-utils.mjs";

process.env.SKIP_ENV_VALIDATION ??= "true";
const { raw, cleanup } = createTempSqliteEnvironment("cogni-widget-publication-db-");

const outputDirectory = join(
  process.cwd(),
  "node_modules",
  ".cache",
  "cogni-widget-publication-test",
);
const outputFile = join(outputDirectory, "publication.mjs");
await mkdir(outputDirectory, { recursive: true });

await build({
  stdin: {
    contents: `
      export { getDb } from "@/lib/db/client";
      export {
        ensureWorkspaceWidget,
        getPublishedWidgetConfig,
        getWidgetPublicationStatus,
        settingsFromPublishedConfig,
      } from "@/features/widget/server/widget-service";
      export { parseWidgetPublicationSnapshot } from "@/features/widget/publication";
      export { publishWidgetDraft } from "@/features/widget/server/widget-publication-service";
    `,
    resolveDir: process.cwd(),
    sourcefile: "widget-publication-test-entry.ts",
  },
  outfile: outputFile,
  bundle: true,
  platform: "node",
  format: "esm",
  packages: "external",
  alias: { "@": resolve("src") },
  plugins: [
    {
      name: "server-only-test-stub",
      setup(buildContext) {
        buildContext.onResolve({ filter: /^server-only$/ }, () => ({
          path: "server-only",
          namespace: "server-only-test-stub",
        }));
        buildContext.onLoad({ filter: /.*/, namespace: "server-only-test-stub" }, () => ({
          contents: "export {};",
          loader: "js",
        }));
      },
    },
  ],
});

const {
  ensureWorkspaceWidget,
  getDb,
  getPublishedWidgetConfig,
  getWidgetPublicationStatus,
  publishWidgetDraft,
  settingsFromPublishedConfig,
} = await import(`${pathToFileURL(outputFile).href}?run=${randomUUID()}`);
const workspaceId = randomUUID();
const foreignWorkspaceId = randomUUID();
const userId = randomUUID();
const now = new Date().toISOString();

before(async () => {
  await raw`
    INSERT INTO "workspace" ("id", "name", "slug", "updatedAt") VALUES
      (${workspaceId}, 'Widget publication test', ${`test-${workspaceId}`}, ${now}),
      (${foreignWorkspaceId}, 'Foreign publication test', ${`test-${foreignWorkspaceId}`}, ${now})
  `;
  await raw`
    INSERT INTO "user" ("id", "name", "email", "updatedAt")
    VALUES (${userId}, 'Publication owner', ${`${userId}@example.test`}, ${Date.now()})
  `;
});

after(async () => {
  await raw`DELETE FROM "workspace" WHERE "id" IN (${workspaceId}, ${foreignWorkspaceId})`;
  await raw`DELETE FROM "user" WHERE "id" = ${userId}`;
  getDb().$client.close?.();
  await cleanup();
  await rm(outputDirectory, { recursive: true, force: true });
});

test("new agents are unpublished; publish, edit, and rollback stay workspace scoped", async () => {
  const db = getDb();
  const agent = await ensureWorkspaceWidget(db, workspaceId);
  assert.equal(agent.publishedVersion, 0);
  assert.equal(await getPublishedWidgetConfig(db, agent), null);

  await raw`
    UPDATE "widget" SET
      "displayName" = 'Published one',
      "instructions" = 'Use only approved sources.',
      "authorizedDomains" = '["example.test"]',
      "updatedAt" = ${new Date().toISOString()}
    WHERE "id" = ${agent.id}
  `;
  const first = await publishWidgetDraft(db, workspaceId, userId);
  assert.equal(first.ok, true);
  if (!first.ok) return;
  assert.equal(first.widget.publishedVersion, 1);
  assert.equal((await getPublishedWidgetConfig(db, first.widget))?.displayName, "Published one");

  await raw`
    UPDATE "widget" SET
      "displayName" = 'Unpublished draft',
      "instructions" = 'This draft must stay private until published.',
      "bookingEnabled" = true,
      "bookingTimezone" = 'Asia/Kolkata',
      "authorizedDomains" = '["revoked.example.test"]',
      "isEnabled" = false,
      "updatedAt" = ${new Date().toISOString()}
    WHERE "id" = ${agent.id}
  `;
  const currentDraft = await db.query.widget.findFirst({
    where: (fields, { eq }) => eq(fields.id, agent.id),
  });
  assert.ok(currentDraft);
  const publishedAfterEdit = await getPublishedWidgetConfig(db, currentDraft);
  assert.ok(publishedAfterEdit);
  assert.equal(publishedAfterEdit?.displayName, "Published one");
  assert.equal(publishedAfterEdit.booking.enabled, false);
  const effectiveConfig = settingsFromPublishedConfig(currentDraft, publishedAfterEdit);
  assert.equal(effectiveConfig.instructions, "Use only approved sources.");
  assert.equal(effectiveConfig.isEnabled, false);
  assert.deepEqual(effectiveConfig.authorizedDomains, ["revoked.example.test"]);

  const second = await publishWidgetDraft(db, workspaceId, userId);
  assert.equal(second.ok, true);
  if (!second.ok) return;
  assert.equal(second.widget.publishedVersion, 2);
  assert.equal(
    (await getPublishedWidgetConfig(db, second.widget))?.displayName,
    "Unpublished draft",
  );
  assert.equal((await getPublishedWidgetConfig(db, second.widget))?.booking.enabled, true);

  await raw`
    UPDATE "widget" SET "displayName" = 'Work in progress', "updatedAt" = ${new Date().toISOString()}
    WHERE "id" = ${agent.id}
  `;
  const restored = await publishWidgetDraft(db, workspaceId, userId, 1);
  assert.equal(restored.ok, true);
  if (!restored.ok) return;
  assert.equal(restored.widget.publishedVersion, 3);
  assert.equal(restored.widget.displayName, "Published one");
  assert.equal(restored.widget.bookingEnabled, false);
  assert.equal((await getPublishedWidgetConfig(db, restored.widget))?.displayName, "Published one");
  const status = await getWidgetPublicationStatus(db, restored.widget);
  assert.equal(status.current?.version, 3);
  assert.equal(status.versions.length, 3);
  assert.equal(status.hasUnpublishedChanges, false);

  const foreignPublish = await publishWidgetDraft(db, foreignWorkspaceId, userId);
  assert.deepEqual(foreignPublish, {
    ok: false,
    status: 404,
    error: "Agent configuration was not found.",
  });
});

test("invalid draft configuration is rejected without changing the live version", async () => {
  const db = getDb();
  const agent = await ensureWorkspaceWidget(db, workspaceId);
  const beforeVersion = agent.publishedVersion;
  await raw`
    UPDATE "widget" SET "instructions" = '   ', "updatedAt" = ${new Date().toISOString()}
    WHERE "id" = ${agent.id}
  `;
  const result = await publishWidgetDraft(db, workspaceId, userId);
  assert.equal(result.ok, false);
  if (result.ok) return;
  assert.equal(result.status, 422);
  const after = await db.query.widget.findFirst({
    where: (fields, { eq }) => eq(fields.id, agent.id),
  });
  assert.equal(after?.publishedVersion, beforeVersion);
});
