-- CreateTable
CREATE TABLE "campaign" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "workspaceId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "instructions" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "campaign_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspace" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "campaign_document" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "campaignId" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "campaign_document_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "campaign" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "campaign_document_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "document" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "lead" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "workspaceId" TEXT NOT NULL,
    "campaignId" TEXT,
    "contactId" TEXT,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "source" TEXT NOT NULL DEFAULT 'ECHO_WIDGET',
    "status" TEXT NOT NULL DEFAULT 'new',
    "capturedFromChat" BOOLEAN NOT NULL DEFAULT false,
    "chatSessionId" TEXT,
    "chatSummary" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "lead_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspace" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "lead_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "campaign" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "lead_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "contact" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "message_feedback" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "messageId" TEXT NOT NULL,
    "visitorSessionId" TEXT NOT NULL,
    "feedback" TEXT NOT NULL,
    "reason" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "message_feedback_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "message" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "message_feedback_visitorSessionId_fkey" FOREIGN KEY ("visitorSessionId") REFERENCES "visitor_session" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "widget_lead_capture" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "visitorSessionId" TEXT NOT NULL,
    "leadId" TEXT,
    "triggerType" TEXT NOT NULL,
    "triggerValue" TEXT,
    "formShownAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "formSubmittedAt" DATETIME,
    "abandoned" BOOLEAN NOT NULL DEFAULT false,
    "messageCountAtCapture" INTEGER NOT NULL DEFAULT 0,
    "conversationSummary" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "widget_lead_capture_visitorSessionId_fkey" FOREIGN KEY ("visitorSessionId") REFERENCES "visitor_session" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "widget_lead_capture_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "lead" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_visitor_session" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "token" TEXT NOT NULL,
    "browserSessionId" TEXT,
    "visitorId" TEXT,
    "hostname" TEXT NOT NULL,
    "externalId" TEXT,
    "pageUrl" TEXT,
    "referrer" TEXT,
    "browser" TEXT,
    "deviceType" TEXT,
    "os" TEXT,
    "country" TEXT,
    "city" TEXT,
    "timezone" TEXT,
    "language" TEXT,
    "screenSize" TEXT,
    "ipData" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "messageCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "lastSeenAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" DATETIME NOT NULL,
    "widgetId" TEXT NOT NULL,
    "contactId" TEXT,
    CONSTRAINT "visitor_session_widgetId_fkey" FOREIGN KEY ("widgetId") REFERENCES "widget" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "visitor_session_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "contact" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_visitor_session" ("contactId", "createdAt", "expiresAt", "externalId", "hostname", "id", "lastSeenAt", "token", "updatedAt", "widgetId") SELECT "contactId", "createdAt", "expiresAt", "externalId", "hostname", "id", "lastSeenAt", "token", "updatedAt", "widgetId" FROM "visitor_session";
DROP TABLE "visitor_session";
ALTER TABLE "new_visitor_session" RENAME TO "visitor_session";
CREATE UNIQUE INDEX "visitor_session_token_key" ON "visitor_session"("token");
CREATE UNIQUE INDEX "visitor_session_browserSessionId_key" ON "visitor_session"("browserSessionId");
CREATE INDEX "visitor_session_widgetId_lastSeenAt_idx" ON "visitor_session"("widgetId", "lastSeenAt");
CREATE INDEX "visitor_session_widgetId_visitorId_idx" ON "visitor_session"("widgetId", "visitorId");
CREATE INDEX "visitor_session_contactId_idx" ON "visitor_session"("contactId");
CREATE INDEX "visitor_session_browserSessionId_idx" ON "visitor_session"("browserSessionId");
CREATE TABLE "new_widget" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "publicKey" TEXT NOT NULL,
    "displayName" TEXT NOT NULL DEFAULT 'Support',
    "welcomeMessage" TEXT NOT NULL DEFAULT 'Hi! How can we help?',
    "inputPlaceholder" TEXT NOT NULL DEFAULT 'Ask a question…',
    "primaryColor" TEXT NOT NULL DEFAULT '#14805e',
    "backgroundColor" TEXT NOT NULL DEFAULT '#ffffff',
    "textColor" TEXT NOT NULL DEFAULT '#171717',
    "position" TEXT NOT NULL DEFAULT 'bottom-right',
    "launcherSize" TEXT NOT NULL DEFAULT 'md',
    "panelWidth" INTEGER NOT NULL DEFAULT 380,
    "panelHeight" INTEGER NOT NULL DEFAULT 640,
    "borderRadius" INTEGER NOT NULL DEFAULT 20,
    "borderRadiusStyle" TEXT NOT NULL DEFAULT 'default',
    "logoUrl" TEXT,
    "instructions" TEXT NOT NULL DEFAULT 'Answer clearly and only use information you know is reliable. If you are unsure, say so.',
    "escalationKeywords" TEXT NOT NULL DEFAULT 'human,agent,person,representative,support team',
    "modelProvider" TEXT NOT NULL DEFAULT 'OPENAI',
    "modelName" TEXT NOT NULL DEFAULT 'gpt-5-mini',
    "isEnabled" BOOLEAN NOT NULL DEFAULT true,
    "theme" TEXT NOT NULL DEFAULT 'light',
    "userBubbleColor" TEXT NOT NULL DEFAULT '#14805e',
    "userBubbleTextColor" TEXT NOT NULL DEFAULT '#ffffff',
    "botBubbleColor" TEXT NOT NULL DEFAULT '#f2f2f8',
    "botBubbleTextColor" TEXT NOT NULL DEFAULT '#171717',
    "headerGradientFrom" TEXT NOT NULL DEFAULT '#14805e',
    "headerGradientTo" TEXT NOT NULL DEFAULT '#0f6b4e',
    "shadowSize" TEXT NOT NULL DEFAULT 'md',
    "suggestions" TEXT NOT NULL DEFAULT '["What services do you offer?","How can I get started?","Tell me more about pricing"]',
    "hideSuggestionsOnInteract" BOOLEAN NOT NULL DEFAULT true,
    "previewMessages" TEXT NOT NULL DEFAULT '["Hi there! 👋","Need help with anything?"]',
    "autoShowPreviewDelay" INTEGER NOT NULL DEFAULT 3000,
    "showBranding" BOOLEAN NOT NULL DEFAULT true,
    "privacyPolicyUrl" TEXT NOT NULL DEFAULT '/privacy-policy',
    "enableLeadCapture" BOOLEAN NOT NULL DEFAULT false,
    "leadCaptureKeywords" TEXT NOT NULL DEFAULT '["contact","contact me","call me","reach me","get in touch"]',
    "leadCaptureMinutesThreshold" INTEGER NOT NULL DEFAULT 5,
    "leadCaptureMessageThreshold" INTEGER NOT NULL DEFAULT 4,
    "enableBrochure" BOOLEAN NOT NULL DEFAULT false,
    "brochureSuggestionText" TEXT NOT NULL DEFAULT 'Receive Brochure',
    "selectedCampaignId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "workspaceId" TEXT NOT NULL,
    CONSTRAINT "widget_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspace" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "widget_selectedCampaignId_fkey" FOREIGN KEY ("selectedCampaignId") REFERENCES "campaign" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_widget" ("backgroundColor", "borderRadius", "createdAt", "displayName", "escalationKeywords", "id", "inputPlaceholder", "instructions", "isEnabled", "launcherSize", "logoUrl", "modelName", "modelProvider", "panelHeight", "panelWidth", "position", "primaryColor", "publicKey", "textColor", "updatedAt", "welcomeMessage", "workspaceId") SELECT "backgroundColor", "borderRadius", "createdAt", "displayName", "escalationKeywords", "id", "inputPlaceholder", "instructions", "isEnabled", "launcherSize", "logoUrl", "modelName", "modelProvider", "panelHeight", "panelWidth", "position", "primaryColor", "publicKey", "textColor", "updatedAt", "welcomeMessage", "workspaceId" FROM "widget";
DROP TABLE "widget";
ALTER TABLE "new_widget" RENAME TO "widget";
CREATE UNIQUE INDEX "widget_publicKey_key" ON "widget"("publicKey");
CREATE UNIQUE INDEX "widget_workspaceId_key" ON "widget"("workspaceId");
CREATE INDEX "widget_selectedCampaignId_idx" ON "widget"("selectedCampaignId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "campaign_workspaceId_idx" ON "campaign"("workspaceId");

-- CreateIndex
CREATE INDEX "campaign_document_documentId_idx" ON "campaign_document"("documentId");

-- CreateIndex
CREATE UNIQUE INDEX "campaign_document_campaignId_documentId_key" ON "campaign_document"("campaignId", "documentId");

-- CreateIndex
CREATE INDEX "lead_workspaceId_email_idx" ON "lead"("workspaceId", "email");

-- CreateIndex
CREATE INDEX "lead_workspaceId_phone_idx" ON "lead"("workspaceId", "phone");

-- CreateIndex
CREATE INDEX "lead_campaignId_idx" ON "lead"("campaignId");

-- CreateIndex
CREATE INDEX "message_feedback_visitorSessionId_idx" ON "message_feedback"("visitorSessionId");

-- CreateIndex
CREATE UNIQUE INDEX "message_feedback_messageId_visitorSessionId_key" ON "message_feedback"("messageId", "visitorSessionId");

-- CreateIndex
CREATE UNIQUE INDEX "widget_lead_capture_visitorSessionId_key" ON "widget_lead_capture"("visitorSessionId");

-- CreateIndex
CREATE UNIQUE INDEX "widget_lead_capture_leadId_key" ON "widget_lead_capture"("leadId");

-- CreateIndex
CREATE INDEX "widget_lead_capture_leadId_idx" ON "widget_lead_capture"("leadId");
