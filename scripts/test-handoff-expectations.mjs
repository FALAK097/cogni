import test from "node:test";
import assert from "node:assert/strict";
import { build } from "esbuild";

const compiled = await build({
  entryPoints: ["src/features/conversations/handoff-expectations.ts"],
  bundle: true,
  write: false,
  format: "esm",
  platform: "node",
});

const { getConversationHandoffStatus, generateHandoffBrief, formatHandoffBriefAsNote } =
  await import(
    `data:text/javascript;base64,${Buffer.from(compiled.outputFiles[0].text).toString("base64")}`
  );

test("getConversationHandoffStatus identifies queued handoffs correctly", () => {
  const status = getConversationHandoffStatus({
    status: "ESCALATED",
    aiPaused: true,
    assigneeName: null,
  });

  assert.equal(status.state, "queued");
  assert.equal(status.isEscalated, true);
  assert.equal(status.isAiPaused, true);
  assert.equal(status.assigneeName, null);
  assert.match(status.label, /Human handoff requested/);
  assert.match(status.description, /queue/i);
});

test("getConversationHandoffStatus identifies assigned teammate takeover correctly", () => {
  const status = getConversationHandoffStatus({
    status: "ESCALATED",
    aiPaused: true,
    assigneeName: "Sarah Connor",
  });

  assert.equal(status.state, "assigned");
  assert.equal(status.isEscalated, true);
  assert.equal(status.isAiPaused, true);
  assert.equal(status.assigneeName, "Sarah Connor");
  assert.match(status.label, /Sarah Connor/);
  assert.match(status.description, /paused/i);
});

test("getConversationHandoffStatus identifies normal AI agent state", () => {
  const status = getConversationHandoffStatus({
    status: "OPEN",
    aiPaused: false,
    assigneeName: null,
  });

  assert.equal(status.state, "bot");
  assert.equal(status.isEscalated, false);
  assert.equal(status.isAiPaused, false);
  assert.match(status.label, /AI agent active/);
});

test("generateHandoffBrief extracts structured summary and verified details", () => {
  const brief = generateHandoffBrief({
    firstQuestion: "How do I upgrade to the Enterprise plan and set up SSO?",
    lastVisitorMessage: "Please connect me with a human representative.",
    visitorName: "Alex Mercer",
    visitorEmail: "alex@enterprise.test",
    sources: ["Enterprise SSO Guide", "Pricing & Plans"],
    isAssigned: false,
    assigneeName: null,
  });

  assert.equal(brief.customerIntent, "How do I upgrade to the Enterprise plan and set up SSO?");
  assert.equal(brief.unresolvedIssue, "Please connect me with a human representative.");
  assert.deepEqual(brief.verifiedDetails, ["Name: Alex Mercer", "Email: alex@enterprise.test"]);
  assert.deepEqual(brief.sourcesConsulted, ["Enterprise SSO Guide", "Pricing & Plans"]);
  assert.match(brief.recommendedNextStep, /Assign a teammate/i);
});

test("formatHandoffBriefAsNote produces markdown suitable for private team notes", () => {
  const brief = generateHandoffBrief({
    firstQuestion: "Can I get a refund for month 2?",
    visitorEmail: "billing-query@test.co",
    sources: ["Refund Policy"],
    isAssigned: true,
    assigneeName: "Support Lead",
  });

  const noteMarkdown = formatHandoffBriefAsNote(brief);
  assert.match(noteMarkdown, /📋 \*\*Handoff Brief\*\*/);
  assert.match(noteMarkdown, /Can I get a refund for month 2\?/);
  assert.match(noteMarkdown, /Refund Policy/);
  assert.match(noteMarkdown, /billing-query@test.co/);
  assert.match(noteMarkdown, /Support Lead/);
});
