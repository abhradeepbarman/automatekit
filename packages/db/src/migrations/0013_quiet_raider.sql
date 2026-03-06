ALTER TABLE "execution_logs" DROP CONSTRAINT "execution_logs_step_id_steps_id_fk";
--> statement-breakpoint
ALTER TABLE "execution_logs" ALTER COLUMN "step_id" SET DATA TYPE varchar;--> statement-breakpoint
ALTER TABLE "execution_logs" ADD COLUMN "app_id" varchar NOT NULL;--> statement-breakpoint
ALTER TABLE "execution_logs" ADD COLUMN "step_type" varchar NOT NULL;