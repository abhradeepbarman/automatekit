ALTER TABLE "execution_logs" DROP CONSTRAINT "execution_logs_workflow_id_workflows_id_fk";
--> statement-breakpoint
ALTER TABLE "execution_logs" DROP CONSTRAINT "execution_logs_step_id_steps_id_fk";
--> statement-breakpoint
ALTER TABLE "execution_logs" ADD CONSTRAINT "execution_logs_workflow_id_workflows_id_fk" FOREIGN KEY ("workflow_id") REFERENCES "public"."workflows"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "execution_logs" ADD CONSTRAINT "execution_logs_step_id_steps_id_fk" FOREIGN KEY ("step_id") REFERENCES "public"."steps"("id") ON DELETE cascade ON UPDATE no action;