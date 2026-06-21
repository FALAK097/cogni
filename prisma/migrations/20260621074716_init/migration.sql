-- CreateTable
CREATE TABLE "user" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "emailVerified" BOOLEAN NOT NULL DEFAULT false,
    "image" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "session" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "expiresAt" DATETIME NOT NULL,
    "token" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "userId" TEXT NOT NULL,
    CONSTRAINT "session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "account" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "accountId" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "accessToken" TEXT,
    "refreshToken" TEXT,
    "idToken" TEXT,
    "accessTokenExpiresAt" DATETIME,
    "refreshTokenExpiresAt" DATETIME,
    "scope" TEXT,
    "password" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "verification" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "identifier" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "expiresAt" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "workspace" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "logo" TEXT,
    "brandColor" TEXT NOT NULL DEFAULT '#14805e',
    "timezone" TEXT NOT NULL DEFAULT 'UTC',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "workspace_member" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "role" TEXT NOT NULL DEFAULT 'MEMBER',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "userId" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    CONSTRAINT "workspace_member_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "workspace_member_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspace" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "contact" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "externalId" TEXT,
    "avatarUrl" TEXT,
    "tags" TEXT NOT NULL DEFAULT '[]',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "lastSeenAt" DATETIME,
    "workspaceId" TEXT NOT NULL,
    CONSTRAINT "contact_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspace" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "contact_note" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "body" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "contactId" TEXT NOT NULL,
    "authorUserId" TEXT NOT NULL,
    CONSTRAINT "contact_note_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "contact" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "contact_note_authorUserId_fkey" FOREIGN KEY ("authorUserId") REFERENCES "user" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "conversation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "subject" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "channel" TEXT NOT NULL DEFAULT 'WIDGET',
    "aiPaused" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "lastMessageAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "messages" TEXT NOT NULL DEFAULT '[]',
    "workspaceId" TEXT NOT NULL,
    "contactId" TEXT NOT NULL,
    "assignedMemberId" TEXT,
    "widgetId" TEXT,
    "visitorSessionId" TEXT,
    CONSTRAINT "conversation_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspace" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "conversation_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "contact" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "conversation_assignedMemberId_fkey" FOREIGN KEY ("assignedMemberId") REFERENCES "workspace_member" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "conversation_widgetId_fkey" FOREIGN KEY ("widgetId") REFERENCES "widget" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "conversation_visitorSessionId_fkey" FOREIGN KEY ("visitorSessionId") REFERENCES "visitor_session" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "widget" (
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
    "authorizedDomains" TEXT NOT NULL DEFAULT '[]',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "workspaceId" TEXT NOT NULL,
    CONSTRAINT "widget_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspace" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "visitor_session" (
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

-- CreateTable
CREATE TABLE "lead" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "workspaceId" TEXT NOT NULL,
    "contactId" TEXT,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "source" TEXT NOT NULL DEFAULT 'WIDGET',
    "status" TEXT NOT NULL DEFAULT 'new',
    "capturedFromChat" BOOLEAN NOT NULL DEFAULT false,
    "chatSessionId" TEXT,
    "chatSummary" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "lead_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspace" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "lead_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "contact" ("id") ON DELETE SET NULL ON UPDATE CASCADE
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

-- CreateTable
CREATE TABLE "attachment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "filename" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "storageKey" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "workspaceId" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    CONSTRAINT "attachment_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspace" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "attachment_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "conversation" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "document" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "sourceType" TEXT NOT NULL,
    "sourceUrl" TEXT,
    "storageKey" TEXT,
    "mimeType" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PROCESSING',
    "errorMessage" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "workspaceId" TEXT NOT NULL,
    CONSTRAINT "document_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspace" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "document_chunk" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "content" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "documentId" TEXT NOT NULL,
    CONSTRAINT "document_chunk_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "document" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "workspace_invite" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'MEMBER',
    "token" TEXT NOT NULL,
    "expiresAt" DATETIME NOT NULL,
    "acceptedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "workspaceId" TEXT NOT NULL,
    CONSTRAINT "workspace_invite_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspace" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "integration" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "provider" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DISCONNECTED',
    "displayName" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "workspaceId" TEXT NOT NULL,
    CONSTRAINT "integration_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspace" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "notification" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "readAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "workspaceId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    CONSTRAINT "notification_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspace" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "domain_event" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "type" TEXT NOT NULL,
    "entityId" TEXT,
    "payload" TEXT NOT NULL DEFAULT '{}',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "workspaceId" TEXT NOT NULL,
    CONSTRAINT "domain_event_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspace" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "workflow_run" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'RUNNING',
    "idempotencyKey" TEXT,
    "input" TEXT NOT NULL DEFAULT '{}',
    "output" TEXT,
    "errorMessage" TEXT,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "maxAttempts" INTEGER NOT NULL DEFAULT 3,
    "startedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" DATETIME,
    "workspaceId" TEXT NOT NULL,
    CONSTRAINT "workflow_run_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspace" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "integration_action" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "provider" TEXT NOT NULL,
    "actionType" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "idempotencyKey" TEXT NOT NULL,
    "payload" TEXT NOT NULL DEFAULT '{}',
    "result" TEXT,
    "errorMessage" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "requestedById" TEXT,
    CONSTRAINT "integration_action_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspace" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "user_email_key" ON "user"("email");

-- CreateIndex
CREATE INDEX "session_userId_idx" ON "session"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "session_token_key" ON "session"("token");

-- CreateIndex
CREATE INDEX "account_userId_idx" ON "account"("userId");

-- CreateIndex
CREATE INDEX "verification_identifier_idx" ON "verification"("identifier");

-- CreateIndex
CREATE UNIQUE INDEX "workspace_slug_key" ON "workspace"("slug");

-- CreateIndex
CREATE INDEX "workspace_member_workspaceId_idx" ON "workspace_member"("workspaceId");

-- CreateIndex
CREATE UNIQUE INDEX "workspace_member_userId_workspaceId_key" ON "workspace_member"("userId", "workspaceId");

-- CreateIndex
CREATE INDEX "contact_workspaceId_updatedAt_idx" ON "contact"("workspaceId", "updatedAt");

-- CreateIndex
CREATE UNIQUE INDEX "contact_workspaceId_email_key" ON "contact"("workspaceId", "email");

-- CreateIndex
CREATE UNIQUE INDEX "contact_workspaceId_externalId_key" ON "contact"("workspaceId", "externalId");

-- CreateIndex
CREATE INDEX "contact_note_contactId_createdAt_idx" ON "contact_note"("contactId", "createdAt");

-- CreateIndex
CREATE INDEX "contact_note_authorUserId_idx" ON "contact_note"("authorUserId");

-- CreateIndex
CREATE INDEX "conversation_workspaceId_status_lastMessageAt_idx" ON "conversation"("workspaceId", "status", "lastMessageAt");

-- CreateIndex
CREATE INDEX "conversation_workspaceId_contactId_idx" ON "conversation"("workspaceId", "contactId");

-- CreateIndex
CREATE INDEX "conversation_assignedMemberId_idx" ON "conversation"("assignedMemberId");

-- CreateIndex
CREATE INDEX "conversation_widgetId_idx" ON "conversation"("widgetId");

-- CreateIndex
CREATE INDEX "conversation_visitorSessionId_idx" ON "conversation"("visitorSessionId");

-- CreateIndex
CREATE UNIQUE INDEX "widget_publicKey_key" ON "widget"("publicKey");

-- CreateIndex
CREATE UNIQUE INDEX "widget_workspaceId_key" ON "widget"("workspaceId");

-- CreateIndex
CREATE UNIQUE INDEX "visitor_session_token_key" ON "visitor_session"("token");

-- CreateIndex
CREATE INDEX "visitor_session_widgetId_lastSeenAt_idx" ON "visitor_session"("widgetId", "lastSeenAt");

-- CreateIndex
CREATE INDEX "visitor_session_widgetId_visitorId_idx" ON "visitor_session"("widgetId", "visitorId");

-- CreateIndex
CREATE INDEX "visitor_session_contactId_idx" ON "visitor_session"("contactId");

-- CreateIndex
CREATE UNIQUE INDEX "visitor_session_widgetId_browserSessionId_key" ON "visitor_session"("widgetId", "browserSessionId");

-- CreateIndex
CREATE INDEX "lead_workspaceId_email_idx" ON "lead"("workspaceId", "email");

-- CreateIndex
CREATE INDEX "lead_workspaceId_phone_idx" ON "lead"("workspaceId", "phone");

-- CreateIndex
CREATE UNIQUE INDEX "widget_lead_capture_visitorSessionId_key" ON "widget_lead_capture"("visitorSessionId");

-- CreateIndex
CREATE UNIQUE INDEX "widget_lead_capture_leadId_key" ON "widget_lead_capture"("leadId");

-- CreateIndex
CREATE INDEX "widget_lead_capture_leadId_idx" ON "widget_lead_capture"("leadId");

-- CreateIndex
CREATE UNIQUE INDEX "attachment_storageKey_key" ON "attachment"("storageKey");

-- CreateIndex
CREATE INDEX "attachment_workspaceId_idx" ON "attachment"("workspaceId");

-- CreateIndex
CREATE INDEX "attachment_conversationId_idx" ON "attachment"("conversationId");

-- CreateIndex
CREATE INDEX "document_workspaceId_status_updatedAt_idx" ON "document"("workspaceId", "status", "updatedAt");

-- CreateIndex
CREATE INDEX "document_chunk_documentId_position_idx" ON "document_chunk"("documentId", "position");

-- CreateIndex
CREATE UNIQUE INDEX "workspace_invite_token_key" ON "workspace_invite"("token");

-- CreateIndex
CREATE INDEX "workspace_invite_token_idx" ON "workspace_invite"("token");

-- CreateIndex
CREATE UNIQUE INDEX "workspace_invite_workspaceId_email_key" ON "workspace_invite"("workspaceId", "email");

-- CreateIndex
CREATE UNIQUE INDEX "integration_workspaceId_provider_key" ON "integration"("workspaceId", "provider");

-- CreateIndex
CREATE INDEX "notification_userId_readAt_createdAt_idx" ON "notification"("userId", "readAt", "createdAt");

-- CreateIndex
CREATE INDEX "notification_workspaceId_createdAt_idx" ON "notification"("workspaceId", "createdAt");

-- CreateIndex
CREATE INDEX "domain_event_workspaceId_type_createdAt_idx" ON "domain_event"("workspaceId", "type", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "workflow_run_idempotencyKey_key" ON "workflow_run"("idempotencyKey");

-- CreateIndex
CREATE INDEX "workflow_run_workspaceId_status_startedAt_idx" ON "workflow_run"("workspaceId", "status", "startedAt");

-- CreateIndex
CREATE UNIQUE INDEX "integration_action_idempotencyKey_key" ON "integration_action"("idempotencyKey");

-- CreateIndex
CREATE INDEX "integration_action_workspaceId_status_createdAt_idx" ON "integration_action"("workspaceId", "status", "createdAt");
