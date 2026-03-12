ALTER TABLE "connections" RENAME COLUMN "access_token" TO "access_token_encrypt";--> statement-breakpoint
ALTER TABLE "connections" RENAME COLUMN "refresh_token" TO "refresh_token_encrypt";--> statement-breakpoint
ALTER TABLE "connections" ADD COLUMN "access_token_iv" varchar NOT NULL;--> statement-breakpoint
ALTER TABLE "connections" ADD COLUMN "access_token_tag" "bytea" NOT NULL;--> statement-breakpoint
ALTER TABLE "connections" ADD COLUMN "refresh_token_iv" varchar;--> statement-breakpoint
ALTER TABLE "connections" ADD COLUMN "refresh_token_tag" "bytea";