CREATE TABLE "conversation_event" (
	"cursor" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "conversation_event_cursor_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"workspaceId" text NOT NULL,
	"conversationId" text NOT NULL,
	"type" text NOT NULL,
	"createdAt" timestamp with time zone DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	CONSTRAINT "conversation_event_type_check" CHECK ("conversation_event"."type" IN ('message', 'state', 'read'))
);
--> statement-breakpoint
ALTER TABLE "conversation_event" ADD CONSTRAINT "conversation_event_workspaceId_workspace_id_fk" FOREIGN KEY ("workspaceId") REFERENCES "public"."workspace"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
CREATE INDEX "conversation_event_workspaceId_cursor_idx" ON "conversation_event" USING btree ("workspaceId","cursor");--> statement-breakpoint
CREATE INDEX "conversation_event_createdAt_idx" ON "conversation_event" USING btree ("createdAt");--> statement-breakpoint
CREATE INDEX "conversation_event_workspaceId_conversationId_cursor_idx" ON "conversation_event" USING btree ("workspaceId","conversationId","cursor");
