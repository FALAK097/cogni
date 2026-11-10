ALTER TABLE "agent_test_publish_check" ADD COLUMN "sourceBasisDigest" text DEFAULT '0000000000000000000000000000000000000000000000000000000000000000' NOT NULL;--> statement-breakpoint
ALTER TABLE "agent_test_publish_check" ALTER COLUMN "sourceBasisDigest" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "agent_test_publish_check" ADD COLUMN "baselineRequestDigest" text;--> statement-breakpoint
ALTER TABLE "agent_test_publish_check" ADD COLUMN "candidateRequestDigest" text;--> statement-breakpoint
ALTER TABLE "agent_test_publish_check" ADD CONSTRAINT "agent_test_publish_check_source_basis_digest_check" CHECK ("agent_test_publish_check"."sourceBasisDigest" ~ '^[0-9a-f]{64}$');--> statement-breakpoint
ALTER TABLE "agent_test_publish_check" ADD CONSTRAINT "agent_test_publish_check_request_digest_check" CHECK (("agent_test_publish_check"."baselineRequestDigest" is null or "agent_test_publish_check"."baselineRequestDigest" ~ '^[0-9a-f]{64}$') and ("agent_test_publish_check"."candidateRequestDigest" is null or "agent_test_publish_check"."candidateRequestDigest" ~ '^[0-9a-f]{64}$'));
