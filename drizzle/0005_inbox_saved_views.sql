CREATE TABLE "inbox_saved_view" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"filter" text DEFAULT 'all' NOT NULL,
	"channel" text,
	"assigneeFilter" text DEFAULT 'all' NOT NULL,
	"createdAt" timestamp with time zone DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	"updatedAt" timestamp with time zone NOT NULL,
	"workspaceId" text NOT NULL,
	"createdByMembershipId" text
);
--> statement-breakpoint
ALTER TABLE "inbox_saved_view" ADD CONSTRAINT "inbox_saved_view_workspaceId_workspace_id_fk" FOREIGN KEY ("workspaceId") REFERENCES "public"."workspace"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "inbox_saved_view" ADD CONSTRAINT "inbox_saved_view_createdByMembershipId_workspace_member_id_fk" FOREIGN KEY ("createdByMembershipId") REFERENCES "public"."workspace_member"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
CREATE UNIQUE INDEX "inbox_saved_view_workspace_name_key" ON "inbox_saved_view" USING btree ("workspaceId",lower("name"));--> statement-breakpoint
CREATE INDEX "inbox_saved_view_workspace_createdAt_idx" ON "inbox_saved_view" USING btree ("workspaceId","createdAt");