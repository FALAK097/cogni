DROP INDEX "search_item_cleanup_workspace_createdAt_idx";--> statement-breakpoint
ALTER TABLE "search_item_cleanup" ADD COLUMN "nextAttemptAt" timestamp with time zone DEFAULT (CURRENT_TIMESTAMP) NOT NULL;--> statement-breakpoint
ALTER TABLE "search_item_cleanup" ADD COLUMN "claimedUntil" timestamp with time zone;--> statement-breakpoint
CREATE INDEX "search_item_cleanup_due_idx" ON "search_item_cleanup" USING btree ("nextAttemptAt","claimedUntil");--> statement-breakpoint
CREATE INDEX "search_item_cleanup_workspace_due_idx" ON "search_item_cleanup" USING btree ("workspaceId","nextAttemptAt","claimedUntil");
