-- AlterTable
ALTER TABLE "workspace" ADD COLUMN "brandColor" TEXT NOT NULL DEFAULT '#14805e';

-- AlterTable
ALTER TABLE "contact" ADD COLUMN "tags" TEXT NOT NULL DEFAULT '[]';

-- AlterTable
ALTER TABLE "conversation" ADD COLUMN "aiPaused" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "message" ADD COLUMN "readAt" DATETIME;

-- AlterTable
ALTER TABLE "widget" ADD COLUMN "escalationKeywords" TEXT NOT NULL DEFAULT 'human,agent,person,representative,support team';

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

-- CreateIndex
CREATE INDEX "contact_note_contactId_createdAt_idx" ON "contact_note"("contactId", "createdAt");

-- CreateIndex
CREATE INDEX "contact_note_authorUserId_idx" ON "contact_note"("authorUserId");

-- CreateIndex
CREATE INDEX "document_workspaceId_status_updatedAt_idx" ON "document"("workspaceId", "status", "updatedAt");

-- CreateIndex
CREATE INDEX "document_chunk_documentId_position_idx" ON "document_chunk"("documentId", "position");

-- CreateIndex
CREATE UNIQUE INDEX "workspace_invite_token_key" ON "workspace_invite"("token");

-- CreateIndex
CREATE UNIQUE INDEX "workspace_invite_workspaceId_email_key" ON "workspace_invite"("workspaceId", "email");

-- CreateIndex
CREATE INDEX "workspace_invite_token_idx" ON "workspace_invite"("token");

-- CreateIndex
CREATE UNIQUE INDEX "integration_workspaceId_provider_key" ON "integration"("workspaceId", "provider");

-- CreateIndex
CREATE INDEX "notification_userId_readAt_createdAt_idx" ON "notification"("userId", "readAt", "createdAt");

-- CreateIndex
CREATE INDEX "notification_workspaceId_createdAt_idx" ON "notification"("workspaceId", "createdAt");

-- CreateIndex
CREATE INDEX "domain_event_workspaceId_type_createdAt_idx" ON "domain_event"("workspaceId", "type", "createdAt");
