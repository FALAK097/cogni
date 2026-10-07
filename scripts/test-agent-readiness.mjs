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
    isSavingConfiguration: false,
    hasUnpublishedChanges: false,
    authorizedDomainCount: 1,
  });
  assert.equal(readiness.complete, false);
  assert.equal(readiness.title, "Publish your agent");
  assert.equal(readiness.action, "Review and publish");
});

test("saved draft changes keep the checklist incomplete", () => {
  const readiness = getAgentPublicationReadiness({
    isEnabled: true,
    hasPublishedVersion: true,
    isSavingConfiguration: false,
    hasUnpublishedChanges: true,
    authorizedDomainCount: 1,
  });
  assert.equal(readiness.complete, false);
  assert.match(readiness.description, /not included in the published agent/);
});

test("paused agents direct owners to resume visitor access", () => {
  const readiness = getAgentPublicationReadiness({
    isEnabled: false,
    hasPublishedVersion: true,
    isSavingConfiguration: false,
    hasUnpublishedChanges: false,
    authorizedDomainCount: 1,
  });
  assert.equal(readiness.complete, false);
  assert.equal(readiness.action, "Resume visitor access");
});

test("published enabled agents complete the checklist item", () => {
  const readiness = getAgentPublicationReadiness({
    isEnabled: true,
    hasPublishedVersion: true,
    isSavingConfiguration: false,
    hasUnpublishedChanges: false,
    authorizedDomainCount: 1,
  });
  assert.equal(readiness.complete, true);
  assert.equal(readiness.title, "Ready to install");
  assert.match(readiness.description, /serve visitors from an authorized website/);
  assert.equal(readiness.actionType, null);
});

test("published agents require an authorized website before installation", () => {
  const readiness = getAgentPublicationReadiness({
    isEnabled: true,
    hasPublishedVersion: true,
    isSavingConfiguration: false,
    hasUnpublishedChanges: false,
    authorizedDomainCount: 0,
  });
  assert.equal(readiness.complete, false);
  assert.equal(readiness.title, "Authorize your website");
  assert.equal(readiness.actionType, "domain");
  assert.equal(readiness.action, "Add a domain");
});

test("configuration saves show progress instead of offering a disabled publish action", () => {
  const readiness = getAgentPublicationReadiness({
    isEnabled: true,
    hasPublishedVersion: false,
    hasUnpublishedChanges: false,
    authorizedDomainCount: 0,
    isSavingConfiguration: true,
  });
  assert.equal(readiness.title, "Saving your changes");
  assert.equal(readiness.actionType, null);
});
