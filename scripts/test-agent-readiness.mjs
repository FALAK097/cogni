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
const { getAgentPublicationReadiness, getAgentLaunchChecklist } = await import(
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

test("launch checklist calculates four stages and overall progress correctly for new agent", () => {
  const checklist = getAgentLaunchChecklist({
    readySourcesCount: 0,
    processingSourcesCount: 0,
    testCasesCount: 0,
    hasTestRun: false,
    isEnabled: true,
    hasPublishedVersion: false,
    hasUnpublishedChanges: false,
    authorizedDomainCount: 0,
    hasObservedSession: false,
    isSavingConfiguration: false,
  });

  assert.equal(checklist.complete, false);
  assert.equal(checklist.totalCount, 4);
  assert.equal(checklist.completedCount, 0);
  assert.equal(checklist.percent, 0);
  assert.equal(checklist.currentStep?.id, "knowledge");
  assert.equal(checklist.currentStep?.actionLabel, "Add knowledge");
});

test("launch checklist marks knowledge in_progress when sources are still indexing", () => {
  const checklist = getAgentLaunchChecklist({
    readySourcesCount: 0,
    processingSourcesCount: 2,
    testCasesCount: 0,
    hasTestRun: false,
    isEnabled: true,
    hasPublishedVersion: false,
    hasUnpublishedChanges: false,
    authorizedDomainCount: 1,
    hasObservedSession: false,
    isSavingConfiguration: false,
  });

  const knowledgeStep = checklist.steps.find((s) => s.id === "knowledge");
  assert.equal(knowledgeStep?.status, "in_progress");
  assert.match(knowledgeStep?.description ?? "", /2 source\(s\) are currently processing/);
});

test("launch checklist advances through stages as knowledge, tests, publish, and install complete", () => {
  const partialChecklist = getAgentLaunchChecklist({
    readySourcesCount: 3,
    processingSourcesCount: 0,
    testCasesCount: 2,
    hasTestRun: true,
    isEnabled: true,
    hasPublishedVersion: false,
    hasUnpublishedChanges: false,
    authorizedDomainCount: 1,
    hasObservedSession: false,
    isSavingConfiguration: false,
  });

  assert.equal(partialChecklist.completedCount, 2);
  assert.equal(partialChecklist.percent, 50);
  assert.equal(partialChecklist.currentStep?.id, "publish");
  assert.equal(partialChecklist.currentStep?.actionLabel, "Review and publish");

  const fullyCompleteChecklist = getAgentLaunchChecklist({
    readySourcesCount: 3,
    processingSourcesCount: 0,
    testCasesCount: 2,
    hasTestRun: true,
    isEnabled: true,
    hasPublishedVersion: true,
    hasUnpublishedChanges: false,
    authorizedDomainCount: 1,
    hasObservedSession: true,
    isSavingConfiguration: false,
  });

  assert.equal(fullyCompleteChecklist.complete, true);
  assert.equal(fullyCompleteChecklist.completedCount, 4);
  assert.equal(fullyCompleteChecklist.percent, 100);
  assert.equal(fullyCompleteChecklist.currentStep, null);
});
