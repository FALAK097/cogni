import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { test } from "node:test";

test("customer setup and troubleshooting document contains required contracts and diagnostics", () => {
  const docPath = "docs/CUSTOMER_SETUP_AND_TROUBLESHOOTING.md";
  assert.ok(existsSync(docPath), `${docPath} must exist`);

  const doc = readFileSync(docPath, "utf8");

  // 1. Google Auth & Workspace Setup
  assert.ok(
    doc.includes("Google-only authentication contract"),
    "doc must specify Google-only auth",
  );
  assert.ok(doc.includes("/api/auth/callback/google"), "doc must document callback URI");
  assert.ok(doc.includes("OWNER"), "doc must document workspace owner role");

  // 2. Knowledge Base & Ingestion Lifecycle
  assert.ok(doc.includes("Supported Source Types"), "doc must list supported source types");
  assert.ok(doc.includes("`pending`"), "doc must document pending state");
  assert.ok(doc.includes("`processing`"), "doc must document processing state");
  assert.ok(doc.includes("`ready`"), "doc must document ready state");
  assert.ok(doc.includes("`failed`"), "doc must document failed state");
  assert.ok(doc.includes("Retry"), "doc must document retry behavior");
  assert.ok(
    doc.includes("Draft Preview vs. Live Publication"),
    "doc must explain preview vs publication",
  );

  // 3. Widget Installation, Authorized Domains & CSP
  assert.ok(
    doc.includes("data-widget-key"),
    "doc must provide copyable script with data-widget-key",
  );
  assert.ok(doc.includes("widget.bundle.js"), "doc must reference widget.bundle.js");
  assert.ok(doc.includes("window.location.origin"), "doc must document origin validation");
  assert.ok(doc.includes("script-src"), "doc must document CSP script-src directive");
  assert.ok(doc.includes("connect-src"), "doc must document CSP connect-src directive");
  assert.ok(doc.includes("Authorized Domains"), "doc must document authorized domains");

  // 4. Publication & Rollback
  assert.ok(doc.includes("Publish Changes"), "doc must document publish action");
  assert.ok(doc.includes("Roll Back to This Version"), "doc must document rollback action");

  // 5. Human Takeover & Channels
  assert.ok(doc.includes("aiPaused"), "doc must document AI pause on takeover");
  assert.ok(doc.includes("receive-capable"), "doc must document receive-capable channel state");
  assert.ok(doc.includes("send-capable"), "doc must document send-capable channel state");
  assert.ok(
    doc.includes("provider-confirmed"),
    "doc must document provider-confirmed channel state",
  );
  assert.ok(doc.includes("Delivery uncertain"), "doc must document uncertain delivery");

  // 6. Troubleshooting Diagnostic Matrix
  assert.ok(doc.includes("Diagnostic Matrix"), "doc must include troubleshooting matrix");
});

test("in-app help page contains matching section anchors and copyable snippets", () => {
  const pagePath = "src/app/help/page.tsx";
  assert.ok(existsSync(pagePath), `${pagePath} must exist`);

  const page = readFileSync(pagePath, "utf8");

  assert.ok(page.includes('id="google-auth"'), "must have google-auth anchor");
  assert.ok(page.includes('id="knowledge-sources"'), "must have knowledge-sources anchor");
  assert.ok(page.includes('id="widget-installation"'), "must have widget-installation anchor");
  assert.ok(page.includes('id="publication"'), "must have publication anchor");
  assert.ok(page.includes('id="human-takeover"'), "must have human-takeover anchor");
  assert.ok(page.includes('id="troubleshooting"'), "must have troubleshooting anchor");
  assert.ok(page.includes("data-widget-key"), "must include copyable widget snippet");
  assert.ok(page.includes("script-src"), "must include CSP example");
});

test("relevant failure and empty states link to the customer setup and troubleshooting guide", () => {
  // Knowledge manager empty and error states
  const km = readFileSync("src/components/workspace/widget-knowledge-manager.tsx", "utf8");
  assert.ok(
    km.includes("/help#knowledge-sources"),
    "knowledge manager must link to knowledge sources help",
  );

  // Widget settings panels
  const wsp = readFileSync("src/components/widget/widget-settings-panels.tsx", "utf8");
  assert.ok(
    wsp.includes("/help#widget-installation"),
    "settings panels must link to widget installation help",
  );
  assert.ok(wsp.includes("/help#publication"), "settings panels must link to publication help");

  // Conversation detail duplicate / uncertain delivery dialog
  const cd = readFileSync("src/components/widget/conversation-detail.tsx", "utf8");
  assert.ok(
    cd.includes("/help#human-takeover"),
    "conversation detail must link to human takeover help",
  );

  // Sign-in page
  const signIn = readFileSync("src/app/(auth)/sign-in/page.tsx", "utf8");
  assert.ok(signIn.includes("/help#google-auth"), "sign-in page must link to google auth help");

  // Nav shells
  const shell = readFileSync("src/components/marketing/marketing-shell.tsx", "utf8");
  assert.ok(shell.includes('href: "/help"'), "marketing shell must link to help");

  const footer = readFileSync("src/components/landing/footer.tsx", "utf8");
  assert.ok(footer.includes('href: "/help"'), "footer must link to help");
});
