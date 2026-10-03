import assert from "node:assert/strict";
import { test } from "node:test";
import { build } from "esbuild";

const compiled = await build({
  entryPoints: ["src/components/widget/widget-settings-payload.ts"],
  bundle: true,
  write: false,
  format: "esm",
  platform: "node",
});
const { toSavePayload } = await import(
  `data:text/javascript;base64,${Buffer.from(compiled.outputFiles[0].text).toString("base64")}`
);

const configuration = {
  workspaceId: "qa-workspace",
  publicKey: "qa-public-key",
  agentName: "QA assistant",
  instructions: "Answer only from the supplied policy.",
  escalationKeywords: "human,agent",
  welcomeMessage: "How can I help?",
  logoUrl: null,
  primaryColor: "#7c3aed",
  backgroundColor: "#ffffff",
  textColor: "#171717",
  userBubbleColor: "#7c3aed",
  userBubbleTextColor: "#ffffff",
  botBubbleColor: "#f2f2f8",
  botBubbleTextColor: "#171717",
  secondaryTextColor: "#171717",
  headerGradientFrom: "#7c3aed",
  headerGradientTo: "#7c3aed",
  theme: "light",
  position: "bottom-right",
  launcherSize: "md",
  borderRadius: "default",
  shadowSize: "md",
  inputPlaceholder: "Ask a question",
  suggestions: [],
  previewMessages: [],
  hideSuggestionsOnInteract: true,
  autoShowPreviewDelay: 0,
  showBranding: true,
  privacyPolicyUrl: "",
  enableLeadCapture: false,
  leadCaptureKeywords: [],
  leadCaptureMinutesThreshold: 5,
  leadCaptureMessageThreshold: 5,
  enableBrochure: false,
  brochureSuggestionText: "",
  allowedDomains: ["example.test"],
  isEnabled: true,
  borderColor: "#eaecf0",
  fontFamily: "Inter",
  fontSize: "14px",
  linkColor: "#7c3aed",
};

for (const [provider, model] of [
  ["OPENAI", "gpt-4o-mini"],
  ["GOOGLE", "gemini-2.5-flash"],
]) {
  test(`agent save includes the selected ${provider} model`, () => {
    const requestBody = JSON.parse(
      JSON.stringify(
        toSavePayload({ ...configuration, modelProvider: provider, modelName: model }),
      ),
    );
    assert.equal(requestBody.modelProvider, provider);
    assert.equal(requestBody.modelName, model);
    assert.equal(requestBody.instructions, configuration.instructions);
    assert.equal(requestBody.agentName, configuration.agentName);
    assert.equal(requestBody.escalationKeywords, configuration.escalationKeywords);
    assert.equal(requestBody.isEnabled, configuration.isEnabled);
    assert.equal(Object.hasOwn(requestBody, "workspaceId"), false);
    assert.equal(Object.hasOwn(requestBody, "publicKey"), false);
  });
}

test("visitor access switch persists false without requiring a publication", () => {
  const requestBody = toSavePayload({ ...configuration, isEnabled: false });
  assert.equal(requestBody.isEnabled, false);
  assert.equal(Object.hasOwn(requestBody, "publication"), false);
});
