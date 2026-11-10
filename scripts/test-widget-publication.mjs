import assert from "node:assert/strict";
import { test } from "node:test";
import { build } from "esbuild";

const compiled = await build({
  entryPoints: ["src/features/widget/publication.ts"],
  bundle: true,
  write: false,
  format: "esm",
  platform: "node",
});
const {
  createWidgetPublicationSnapshot,
  mergeWidgetPublication,
  parseWidgetPublicationSnapshot,
  toWidgetDraftStorageValues,
} = await import(
  `data:text/javascript;base64,${Buffer.from(compiled.outputFiles[0].text).toString("base64")}`
);

const widgetConfig = {
  publicKey: "public-key",
  workspaceId: "workspace-one",
  displayName: "Support",
  welcomeMessage: "How can we help?",
  inputPlaceholder: "Ask a question",
  primaryColor: "#7c3aed",
  backgroundColor: "#ffffff",
  textColor: "#171717",
  borderColor: "#eaecf0",
  fontFamily: "Inter",
  fontSize: "14px",
  position: "bottom-right",
  launcherSize: "md",
  panelWidth: 380,
  panelHeight: 640,
  borderRadius: 20,
  borderRadiusStyle: "default",
  logoUrl: null,
  instructions: "Answer using the supplied knowledge.",
  escalationKeywords: "human, agent",
  modelProvider: "OPENAI",
  modelName: "gpt-4o-mini",
  isEnabled: true,
  authorizedDomains: ["example.com"],
  theme: "light",
  userBubbleColor: "#7c3aed",
  userBubbleTextColor: "#ffffff",
  botBubbleColor: "#f2f2f8",
  botBubbleTextColor: "#171717",
  headerGradientFrom: "#7c3aed",
  headerGradientTo: "#7c3aed",
  shadowSize: "md",
  suggestions: ["How does billing work?"],
  hideSuggestionsOnInteract: true,
  previewMessages: ["Hello"],
  autoShowPreviewDelay: 3000,
  showBranding: true,
  privacyPolicyUrl: "/privacy-policy",
  enableLeadCapture: false,
  leadCaptureKeywords: ["contact me"],
  leadCaptureMinutesThreshold: 5,
  leadCaptureMessageThreshold: 4,
  enableBrochure: false,
  brochureSuggestionText: "Receive brochure",
};
const booking = {
  enabled: false,
  timezone: "UTC",
  durationMinutes: 30,
  minimumNoticeMinutes: 60,
  workingHours: { start: "09:00", end: "17:00", weekdays: [1, 2, 3, 4, 5] },
};

test("published snapshots validate config and exclude live security controls and identity", () => {
  const snapshot = createWidgetPublicationSnapshot(widgetConfig, booking);
  assert.equal(snapshot.schemaVersion, 1);
  assert.equal(snapshot.config.instructions, widgetConfig.instructions);
  assert.deepEqual(snapshot.config.booking, booking);
  assert.equal(Object.hasOwn(snapshot.config, "publicKey"), false);
  assert.equal(Object.hasOwn(snapshot.config, "workspaceId"), false);
  assert.equal(Object.hasOwn(snapshot.config, "isEnabled"), false);
  assert.equal(Object.hasOwn(snapshot.config, "authorizedDomains"), false);
});

test("invalid critical draft settings cannot become a publication", () => {
  assert.throws(() =>
    createWidgetPublicationSnapshot({ ...widgetConfig, instructions: "   " }, booking),
  );
  assert.throws(() =>
    createWidgetPublicationSnapshot({ ...widgetConfig, displayName: "" }, booking),
  );
  assert.throws(() =>
    createWidgetPublicationSnapshot({ ...widgetConfig, modelProvider: "OTHER" }, booking),
  );
});

test("malformed publication snapshots fail closed", () => {
  assert.equal(parseWidgetPublicationSnapshot(null), null);
  assert.equal(parseWidgetPublicationSnapshot({ schemaVersion: 2, config: {} }), null);
  assert.equal(
    parseWidgetPublicationSnapshot({
      schemaVersion: 1,
      config: { displayName: "Support", instructions: "Only part of the config" },
    }),
    null,
  );
});

test("production config uses the publication while preserving immediate domain and kill controls", () => {
  const snapshot = createWidgetPublicationSnapshot(widgetConfig, booking);
  const settings = mergeWidgetPublication(snapshot.config, {
    workspaceId: "workspace-one",
    publicKey: "public-key",
    isEnabled: false,
    authorizedDomains: ["new.example.com"],
  });
  assert.equal(settings.instructions, widgetConfig.instructions);
  assert.equal(settings.isEnabled, false);
  assert.deepEqual(settings.authorizedDomains, ["new.example.com"]);
});

test("restoring a version writes JSON arrays in the widget's storage format", () => {
  const snapshot = createWidgetPublicationSnapshot(widgetConfig, booking);
  const values = toWidgetDraftStorageValues(snapshot.config);
  assert.equal(values.suggestions, JSON.stringify(widgetConfig.suggestions));
  assert.equal(values.previewMessages, JSON.stringify(widgetConfig.previewMessages));
  assert.equal(values.leadCaptureKeywords, JSON.stringify(widgetConfig.leadCaptureKeywords));
  assert.equal(values.instructions, widgetConfig.instructions);
  assert.equal(values.bookingEnabled, booking.enabled);
  assert.equal(values.bookingWorkingHours, JSON.stringify(booking.workingHours));
});
