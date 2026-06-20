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
CREATE UNIQUE INDEX "workflow_run_idempotencyKey_key" ON "workflow_run"("idempotencyKey");

-- CreateIndex
CREATE INDEX "workflow_run_workspaceId_status_startedAt_idx" ON "workflow_run"("workspaceId", "status", "startedAt");

-- CreateIndex
CREATE UNIQUE INDEX "integration_action_idempotencyKey_key" ON "integration_action"("idempotencyKey");

-- CreateIndex
CREATE INDEX "integration_action_workspaceId_status_createdAt_idx" ON "integration_action"("workspaceId", "status", "createdAt");
