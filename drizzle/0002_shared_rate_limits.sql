CREATE TABLE "rate_limit_bucket" (
	"keyHash" text PRIMARY KEY NOT NULL,
	"count" integer NOT NULL,
	"resetAt" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE INDEX "rate_limit_bucket_resetAt_idx" ON "rate_limit_bucket" USING btree ("resetAt");