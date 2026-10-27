import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";

const [conversationDetail, dashboardShell, productDesign, designSystem, conversations] =
  await Promise.all([
    readFile("src/components/widget/conversation-detail.tsx", "utf8"),
    readFile("src/components/app-nav/dashboard-shell.tsx", "utf8"),
    readFile("docs/product-design.md", "utf8"),
    readFile("docs/design/product-design-system.md", "utf8"),
    readFile("src/components/widget/widget-conversations.tsx", "utf8"),
  ]);

test("conversation detail keeps channel and recipient context visible for replies", () => {
  assert.match(conversationDetail, /getConversationChannelLabel\(session\.conversationChannel\)/);
  assert.match(
    conversationDetail,
    /To \$\{session\.contactEmail \|\| session\.contactPhone \|\| displayName\}/,
  );
  assert.match(conversationDetail, /title=\{replyTarget\}/);
});

test("full-bleed agent and inbox retain mobile topbar controls without a desktop topbar", () => {
  assert.match(dashboardShell, /pathname === "\/agent" \|\| pathname === "\/inbox"/);
  assert.match(dashboardShell, /className=\{isFullBleedPage \? "lg:hidden" : undefined\}/);
});

test("design references agree on the current neutral primary and preserve interaction cues", () => {
  assert.match(productDesign, /design\/product-design-system\.md/);
  assert.match(productDesign, /retired blue primary token/);
  assert.match(designSystem, /charcoal primary token is the filled-action treatment/);
  assert.match(designSystem, /visible focus ring/);
  assert.match(productDesign, /locally hosted Inter/);
  assert.doesNotMatch(productDesign, /Keep Geist/);
  assert.doesNotMatch(conversations, /countKind|activeCountKind/);
});
