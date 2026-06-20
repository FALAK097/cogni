-- CreateTable
CREATE TABLE "attachment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "filename" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "storageKey" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "workspaceId" TEXT NOT NULL,
    "messageId" TEXT NOT NULL,
    CONSTRAINT "attachment_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspace" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "attachment_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "message" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "attachment_storageKey_key" ON "attachment"("storageKey");

-- CreateIndex
CREATE INDEX "attachment_workspaceId_idx" ON "attachment"("workspaceId");

-- CreateIndex
CREATE INDEX "attachment_messageId_idx" ON "attachment"("messageId");
