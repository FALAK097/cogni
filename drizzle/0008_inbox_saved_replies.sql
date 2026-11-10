CREATE TABLE "inbox_macro" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"content" text NOT NULL,
	"createdAt" timestamp with time zone DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	"updatedAt" timestamp with time zone NOT NULL,
	"workspaceId" text NOT NULL,
	"createdByMembershipId" text
);
--> statement-breakpoint
ALTER TABLE "inbox_macro" ADD CONSTRAINT "inbox_macro_workspaceId_workspace_id_fk" FOREIGN KEY ("workspaceId") REFERENCES "public"."workspace"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "inbox_macro" ADD CONSTRAINT "inbox_macro_createdByMembershipId_workspace_member_id_fk" FOREIGN KEY ("createdByMembershipId") REFERENCES "public"."workspace_member"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
CREATE UNIQUE INDEX "inbox_macro_workspace_name_key" ON "inbox_macro" USING btree ("workspaceId",lower("name"));--> statement-breakpoint
CREATE INDEX "inbox_macro_workspace_createdAt_idx" ON "inbox_macro" USING btree ("workspaceId","createdAt");