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
    "position" TEXT NOT NULL DEFAULT 'RIGHT',
    "launcherSize" TEXT NOT NULL DEFAULT 'MEDIUM',
    "panelWidth" INTEGER NOT NULL DEFAULT 380,
    "panelHeight" INTEGER NOT NULL DEFAULT 640,
    "borderRadius" INTEGER NOT NULL DEFAULT 20,
    "logoUrl" TEXT,
    "instructions" TEXT NOT NULL DEFAULT 'Answer clearly and only use information you know is reliable. If you are unsure, say so.',
    "modelProvider" TEXT NOT NULL DEFAULT 'OPENAI',
    "modelName" TEXT NOT NULL DEFAULT 'gpt-5-mini',
    "isEnabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "workspaceId" TEXT NOT NULL,
    CONSTRAINT "widget_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspace" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "authorized_domain" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "hostname" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "widgetId" TEXT NOT NULL,
    CONSTRAINT "authorized_domain_widgetId_fkey" FOREIGN KEY ("widgetId") REFERENCES "widget" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "visitor_session" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "token" TEXT NOT NULL,
    "hostname" TEXT NOT NULL,
    "externalId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "lastSeenAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" DATETIME NOT NULL,
    "widgetId" TEXT NOT NULL,
    "contactId" TEXT,
    CONSTRAINT "visitor_session_widgetId_fkey" FOREIGN KEY ("widgetId") REFERENCES "widget" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "visitor_session_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "contact" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_conversation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "subject" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "channel" TEXT NOT NULL DEFAULT 'MANUAL',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "lastMessageAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "workspaceId" TEXT NOT NULL,
    "contactId" TEXT NOT NULL,
    "assignedMembershipId" TEXT,
    "widgetId" TEXT,
    "visitorSessionId" TEXT,
    CONSTRAINT "conversation_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspace" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "conversation_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "contact" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "conversation_assignedMembershipId_fkey" FOREIGN KEY ("assignedMembershipId") REFERENCES "membership" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "conversation_widgetId_fkey" FOREIGN KEY ("widgetId") REFERENCES "widget" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "conversation_visitorSessionId_fkey" FOREIGN KEY ("visitorSessionId") REFERENCES "visitor_session" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_conversation" ("assignedMembershipId", "channel", "contactId", "createdAt", "id", "lastMessageAt", "status", "subject", "updatedAt", "workspaceId") SELECT "assignedMembershipId", "channel", "contactId", "createdAt", "id", "lastMessageAt", "status", "subject", "updatedAt", "workspaceId" FROM "conversation";
DROP TABLE "conversation";
ALTER TABLE "new_conversation" RENAME TO "conversation";
CREATE INDEX "conversation_workspaceId_status_lastMessageAt_idx" ON "conversation"("workspaceId", "status", "lastMessageAt");
CREATE INDEX "conversation_workspaceId_contactId_idx" ON "conversation"("workspaceId", "contactId");
CREATE INDEX "conversation_assignedMembershipId_idx" ON "conversation"("assignedMembershipId");
CREATE INDEX "conversation_widgetId_idx" ON "conversation"("widgetId");
CREATE INDEX "conversation_visitorSessionId_idx" ON "conversation"("visitorSessionId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "widget_publicKey_key" ON "widget"("publicKey");

-- CreateIndex
CREATE UNIQUE INDEX "widget_workspaceId_key" ON "widget"("workspaceId");

-- CreateIndex
CREATE INDEX "authorized_domain_hostname_idx" ON "authorized_domain"("hostname");

-- CreateIndex
CREATE UNIQUE INDEX "authorized_domain_widgetId_hostname_key" ON "authorized_domain"("widgetId", "hostname");

-- CreateIndex
CREATE UNIQUE INDEX "visitor_session_token_key" ON "visitor_session"("token");

-- CreateIndex
CREATE INDEX "visitor_session_widgetId_lastSeenAt_idx" ON "visitor_session"("widgetId", "lastSeenAt");

-- CreateIndex
CREATE INDEX "visitor_session_contactId_idx" ON "visitor_session"("contactId");
