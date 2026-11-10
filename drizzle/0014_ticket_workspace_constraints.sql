CREATE UNIQUE INDEX "contact_workspaceId_id_key" ON "contact" USING btree ("workspaceId","id");--> statement-breakpoint
CREATE UNIQUE INDEX "conversation_workspaceId_id_key" ON "conversation" USING btree ("workspaceId","id");--> statement-breakpoint
ALTER TABLE "ticket" ADD CONSTRAINT "ticket_workspace_conversation_fk" FOREIGN KEY ("workspaceId","conversationId") REFERENCES "public"."conversation"("workspaceId","id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "ticket" ADD CONSTRAINT "ticket_workspace_contact_fk" FOREIGN KEY ("workspaceId","contactId") REFERENCES "public"."contact"("workspaceId","id") ON DELETE cascade ON UPDATE cascade;
