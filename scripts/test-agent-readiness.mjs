import assert from "node:assert/strict";
import { test } from "node:test";
import { build } from "esbuild";

const compiled = await build({
  entryPoints: ["src/features/widget/agent-readiness.ts"],
  bundle: true,
  write: false,
  format: "esm",
  platform: "node",
});
const { getAgentPublicationReadiness } = await import(
  `data:text/javascript;base64,${Buffer.from(compiled.outputFiles[0].text).toString("base64")}`
);

test("new agents stay incomplete until an enabled version is published", () => {
  const readiness = getAgentPublicationReadiness({
    isEnabled: true,
    hasPublishedVersion: false,
    hasUnpublishedChanges: false,
  });
  assert.equal(readiness.complete, false);
  assert.equal(readiness.title, "Publish your agent");
  assert.equal(readiness.action, "Review and publish");
});

test("saved draft changes keep the checklist incomplete", () => {
  const readiness = getAgentPublicationReadiness({
    isEnabled: true,
    hasPublishedVersion: true,
    hasUnpublishedChanges: true,
  });
  assert.equal(readiness.complete, false);
  assert.match(readiness.description, /not included in the published agent/);
});

test("paused agents direct owners to resume visitor access", () => {
  const readiness = getAgentPublicationReadiness({
    isEnabled: false,
    hasPublishedVersion: true,
    hasUnpublishedChanges: false,
  });
  assert.equal(readiness.complete, false);
  assert.equal(readiness.action, "Resume widget");
});

test("published enabled agents complete the checklist item", () => {
  const readiness = getAgentPublicationReadiness({
    isEnabled: true,
    hasPublishedVersion: true,
    hasUnpublishedChanges: false,
  });
  assert.equal(readiness.complete, true);
  assert.equal(readiness.title, "Agent published");
  assert.match(readiness.description, /ready to install/);
  assert.doesNotMatch(readiness.description, /available to visitors/);
});
