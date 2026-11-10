CREATE TABLE "document_revision" (
	"id" text PRIMARY KEY NOT NULL,
	"documentId" text NOT NULL,
	"revisionNumber" integer NOT NULL,
	"contentSha256" text NOT NULL,
	"sourceType" text NOT NULL,
	"status" text DEFAULT 'CURRENT' NOT NULL,
	"createdAt" timestamp with time zone DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	"retiredAt" timestamp with time zone,
	"workspaceId" text NOT NULL,
	CONSTRAINT "document_revision_number_positive_check" CHECK ("document_revision"."revisionNumber" > 0),
	CONSTRAINT "document_revision_hash_sha256_check" CHECK ("document_revision"."contentSha256" ~ '^[0-9a-f]{64}$'),
	CONSTRAINT "document_revision_status_check" CHECK ("document_revision"."status" in ('CURRENT', 'SUPERSEDED', 'DELETED'))
);
--> statement-breakpoint
ALTER TABLE "document_revision" ADD CONSTRAINT "document_revision_workspaceId_workspace_id_fk" FOREIGN KEY ("workspaceId") REFERENCES "public"."workspace"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
CREATE UNIQUE INDEX "document_revision_workspace_document_number_key" ON "document_revision" USING btree ("workspaceId","documentId","revisionNumber");--> statement-breakpoint
CREATE UNIQUE INDEX "document_revision_current_key" ON "document_revision" USING btree ("workspaceId","documentId") WHERE "document_revision"."status" = 'CURRENT';--> statement-breakpoint
CREATE INDEX "document_revision_workspace_document_createdAt_idx" ON "document_revision" USING btree ("workspaceId","documentId","createdAt");
