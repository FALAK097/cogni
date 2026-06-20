/*
  Warnings:

  - A unique constraint covering the columns `[workspaceId,externalId]` on the table `contact` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "contact" ADD COLUMN "externalId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "contact_workspaceId_externalId_key" ON "contact"("workspaceId", "externalId");
