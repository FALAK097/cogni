import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { mkdir, readFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { after, before, test } from "node:test";
import "dotenv/config";
import { build } from "esbuild";
import postgres from "postgres";

process.env.SKIP_ENV_VALIDATION ??= "true";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl || !["localhost", "127.0.0.1", "::1"].includes(new URL(databaseUrl).hostname)) {
  throw new Error("Widget publication integration tests require a local DATABASE_URL.");
}

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
const raw = postgres(databaseUrl, { max: 1, prepare: false });
const workspaceId = randomUUID();
const foreignWorkspaceId = randomUUID();
const userId = randomUUID();
const now = new Date().toISOString();

const migration = await readFile(
  join(process.cwd(), "drizzle", "0010_agent_publication_versions.sql"),
  "utf8",
);

function migrationFunction(name) {
  const start = migration.indexOf(`CREATE FUNCTION pg_temp.${name}(`);
  const end = migration.indexOf("$$;--> statement-breakpoint", start);
  if (start < 0 || end < 0) throw new Error(`Could not find ${name} in the widget migration.`);
  return migration.slice(start, end + 3);
}

before(async () => {
  await raw`
    INSERT INTO "workspace" ("id", "name", "slug", "updatedAt") VALUES
      (${workspaceId}, 'Widget publication test', ${`test-${workspaceId}`}, ${now}),
      (${foreignWorkspaceId}, 'Foreign publication test', ${`test-${foreignWorkspaceId}`}, ${now})
  `;
  await raw`
    INSERT INTO "user" ("id", "name", "email", "updatedAt")
    VALUES (${userId}, 'Publication owner', ${`${userId}@example.test`}, ${now})
  `;
});

after(async () => {
  await raw`DELETE FROM "workspace" WHERE "id" IN (${workspaceId}, ${foreignWorkspaceId})`;
  await raw`DELETE FROM "user" WHERE "id" = ${userId}`;
  await getDb().$client.end({ timeout: 5 });
  await raw.end({ timeout: 5 });
});

test("legacy backfill helpers keep published snapshots within runtime schema limits", async () => {
  await raw.unsafe(migrationFunction("widget_json_array_or_empty"));
  await raw.unsafe(migrationFunction("widget_json_object_or_default"));

  const [normalized] = await raw`
    SELECT
      pg_temp.widget_json_array_or_empty(${JSON.stringify(["ok", 7, "three", "four"])}, 3, 5) AS suggestions,
      pg_temp.widget_json_array_or_empty(${JSON.stringify(["valid", "x".repeat(101)])}, 20, 100) AS keywords,
      pg_temp.widget_json_object_or_default(${JSON.stringify({
        start: "09:00",
        end: "17:00",
        weekdays: [1, "2", 9, -1, 6.5],
      })}) AS working_hours,
      pg_temp.widget_json_object_or_default(${JSON.stringify({
        start: "9am",
        end: "17:00",
        weekdays: [1, 2],
      })}) AS fallback_hours
  `;

  assert.deepEqual(normalized.suggestions, ["ok", "three"]);
  assert.deepEqual(normalized.keywords, ["valid"]);
  assert.deepEqual(normalized.working_hours, {
    start: "09:00",
    end: "17:00",
    weekdays: [1],
  });
  assert.deepEqual(normalized.fallback_hours, {
    start: "09:00",
    end: "17:00",
    weekdays: [1, 2, 3, 4, 5],
  });
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
