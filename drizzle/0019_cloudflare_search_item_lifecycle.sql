CREATE TABLE "search_item_cleanup" (
	"id" text PRIMARY KEY NOT NULL,
	"itemId" text,
	"itemKey" text NOT NULL,
	"documentId" text NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"createdAt" timestamp with time zone DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	"updatedAt" timestamp with time zone NOT NULL,
	"workspaceId" text NOT NULL
);
--> statement-breakpoint
ALTER TABLE "document_revision" ADD COLUMN "providerItemId" text;--> statement-breakpoint
ALTER TABLE "document_revision" ADD COLUMN "providerItemKey" text;--> statement-breakpoint
ALTER TABLE "search_item_cleanup" ADD CONSTRAINT "search_item_cleanup_workspaceId_workspace_id_fk" FOREIGN KEY ("workspaceId") REFERENCES "public"."workspace"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
CREATE INDEX "search_item_cleanup_workspace_createdAt_idx" ON "search_item_cleanup" USING btree ("workspaceId","createdAt");
