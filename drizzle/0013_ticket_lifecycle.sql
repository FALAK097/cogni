CREATE TYPE "public"."ticket_priority" AS ENUM('LOW', 'NORMAL', 'HIGH', 'URGENT');--> statement-breakpoint
CREATE TYPE "public"."ticket_status" AS ENUM('OPEN', 'PENDING', 'RESOLVED');--> statement-breakpoint
CREATE TABLE "ticket" (
	"id" text PRIMARY KEY NOT NULL,
	"workspaceId" text NOT NULL,
	"conversationId" text NOT NULL,
	"contactId" text NOT NULL,
	"title" text NOT NULL,
	"status" "ticket_status" DEFAULT 'OPEN' NOT NULL,
	"priority" "ticket_priority" DEFAULT 'NORMAL' NOT NULL,
	"assignedMemberId" text,
	"dueAt" timestamp with time zone,
	"createdByMembershipId" text,
	"createdAt" timestamp with time zone DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	CONSTRAINT "ticket_title_check" CHECK (length(trim("ticket"."title")) BETWEEN 1 AND 240)
);
--> statement-breakpoint
ALTER TABLE "ticket" ADD CONSTRAINT "ticket_workspaceId_workspace_id_fk" FOREIGN KEY ("workspaceId") REFERENCES "public"."workspace"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "ticket" ADD CONSTRAINT "ticket_conversationId_conversation_id_fk" FOREIGN KEY ("conversationId") REFERENCES "public"."conversation"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "ticket" ADD CONSTRAINT "ticket_contactId_contact_id_fk" FOREIGN KEY ("contactId") REFERENCES "public"."contact"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "ticket" ADD CONSTRAINT "ticket_assignedMemberId_workspace_member_id_fk" FOREIGN KEY ("assignedMemberId") REFERENCES "public"."workspace_member"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "ticket" ADD CONSTRAINT "ticket_createdByMembershipId_workspace_member_id_fk" FOREIGN KEY ("createdByMembershipId") REFERENCES "public"."workspace_member"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
CREATE UNIQUE INDEX "ticket_workspace_conversation_key" ON "ticket" USING btree ("workspaceId","conversationId");--> statement-breakpoint
CREATE INDEX "ticket_workspace_status_updated_idx" ON "ticket" USING btree ("workspaceId","status","updatedAt");--> statement-breakpoint
CREATE INDEX "ticket_workspace_assignee_status_idx" ON "ticket" USING btree ("workspaceId","assignedMemberId","status");--> statement-breakpoint
CREATE INDEX "ticket_workspace_due_idx" ON "ticket" USING btree ("workspaceId","dueAt");