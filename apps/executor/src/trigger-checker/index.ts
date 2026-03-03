import apps from '@repo/common/@apps';
import { ExecutionStatus, StepType, type IApp } from '@repo/common/types';
import db from '@repo/db';
import { executionLogs, workflows } from '@repo/db/schema';
import { eq } from 'drizzle-orm';
import cron from 'node-cron';
import { v4 as uuid } from 'uuid';
import { actionQueue, queueName } from '../queue';
import { getRefreshTokenAndUpdate } from '../utils';

function hasValidAuth(app: IApp, triggerDetails: any): boolean {
  if (!app.auth) {
    return true;
  }

  if (!triggerDetails.connections || !triggerDetails.connections.accessToken) {
    return false;
  }

  if (
    triggerDetails.connections.expiresAt &&
    new Date(triggerDetails.connections.expiresAt) < new Date()
  ) {
    return false;
  }

  return true;
}

async function updateExecutionLog(
  logId: string,
  status: ExecutionStatus,
  message: string,
) {
  await db
    .update(executionLogs)
    .set({ status, message })
    .where(eq(executionLogs.id, logId));
}

async function queueNextAction(workflow: any, jobId: string): Promise<boolean> {
  const firstActionDetails = workflow.steps.find(
    (step: any) => step.index === 1,
  );

  if (!firstActionDetails) {
    console.log(`Workflow ${workflow.id} has no action step after trigger`);
    return false;
  }

  if (firstActionDetails.type !== StepType.ACTION) {
    console.log(`Workflow ${workflow.id} second step is not an action`);
    return false;
  }

  console.log(
    `Adding action ${firstActionDetails.id} to queue for workflow ${workflow.id}`,
  );

  await actionQueue.add(queueName, {
    stepId: firstActionDetails.id,
    jobId,
  });

  console.log(
    `Action ${firstActionDetails.id} added to queue for workflow ${workflow.id}`,
  );

  return true;
}

async function handleSuccessfulTrigger(
  workflow: any,
  triggerDetails: any,
  trigger: any,
  log: any,
  jobId: string,
  message: string,
) {
  console.log(
    `Trigger ${triggerDetails.name} ran successfully for workflow ${workflow.id}`,
  );

  await updateExecutionLog(
    log.id,
    ExecutionStatus.COMPLETED,
    message || `Trigger ${trigger.name} completed successfully`,
  );

  await queueNextAction(workflow, jobId);
}

export function startTriggerChecker() {
  cron.schedule('* * * * *', async () => {
    try {
      console.log('Checking triggers...');
      const activeWorkflows = await db.query.workflows.findMany({
        where: eq(workflows.isActive, true),
        with: {
          steps: {
            with: {
              connections: true,
            },
          },
        },
      });

      if (!activeWorkflows || activeWorkflows.length === 0) {
        return;
      }
      console.log(`Found ${activeWorkflows.length} active workflows`);

      for (const workflow of activeWorkflows) {
        const triggerDetails = workflow.steps.find((step) => step.index === 0);
        if (!triggerDetails) {
          console.log(`Workflow ${workflow.id} has no trigger step`);
          continue;
        }

        if (triggerDetails.type !== StepType.TRIGGER) {
          console.log(`Workflow ${workflow.id} first step is not a trigger`);
          continue;
        }

        const app = apps.find((app) => app.id === triggerDetails.app);
        if (!app) {
          console.log(
            `App ${triggerDetails.app} not found for workflow ${workflow.id}`,
          );
          continue;
        }

        if (!app.triggers) {
          console.log(`App ${app.name} has no triggers`);
          continue;
        }

        const trigger = app.triggers.find(
          (trigger) =>
            trigger.id === (triggerDetails.metadata as any).data.triggerId,
        );

        if (!trigger) {
          console.log(
            `Trigger ${(triggerDetails.metadata as any).data.triggerId} not found in app ${app.id}`,
          );
          continue;
        }

        if (!hasValidAuth(app, triggerDetails)) {
          console.log(`Workflow ${workflow.id} has invalid auth`);
          continue;
        }

        console.log(
          `Running trigger ${trigger.id} for workflow ${workflow.id}`,
        );

        const jobId = uuid();
        const [log] = await db
          .insert(executionLogs)
          .values({
            workflowId: workflow.id,
            stepId: triggerDetails.id,
            jobId: jobId,
            message: `Trigger ${trigger.name} execution started`,
            status: ExecutionStatus.RUNNING,
          })
          .returning();

        if (!log) {
          console.log(
            `Failed to create execution log for workflow ${workflow.id}`,
          );
          continue;
        }

        let { success, message, statusCode } = await trigger.run(
          (triggerDetails.metadata as any).data.fields,
          workflow.lastExecutedAt,
          triggerDetails.connections?.accessToken || '',
        );

        if (success && statusCode === 200) {
          await handleSuccessfulTrigger(
            workflow,
            triggerDetails,
            trigger,
            log,
            jobId,
            message,
          );
        } else if (!success && statusCode === 401) {
          console.error(
            `Trigger ${triggerDetails.name} failed for workflow ${workflow.id}: ${message}`,
          );

          const { access_token } = await getRefreshTokenAndUpdate(
            triggerDetails.connectionId!,
            app,
          );

          if (!access_token) {
            console.error(
              `Failed to refresh token for workflow ${workflow.id}`,
            );
            await updateExecutionLog(
              log.id,
              ExecutionStatus.FAILED,
              `Trigger ${trigger.name} failed`,
            );
            return;
          }

          const retryResult = await trigger.run(
            (triggerDetails.metadata as any).data.fields,
            workflow.lastExecutedAt,
            access_token,
          );

          if (retryResult.success && retryResult.statusCode === 200) {
            await handleSuccessfulTrigger(
              workflow,
              triggerDetails,
              trigger,
              log,
              jobId,
              retryResult.message,
            );
          } else {
            console.error(
              `Trigger ${triggerDetails.name} failed for workflow ${workflow.id}: ${retryResult.message}`,
            );
            await updateExecutionLog(
              log.id,
              ExecutionStatus.FAILED,
              retryResult.message || `Trigger ${trigger.name} failed`,
            );
          }
        } else {
          await updateExecutionLog(
            log.id,
            ExecutionStatus.FAILED,
            message || `Trigger ${trigger.name} failed`,
          );
        }

        await db
          .update(workflows)
          .set({
            lastExecutedAt: new Date(),
          })
          .where(eq(workflows.id, workflow.id));
      }
    } catch (error) {
      console.error('Error checking triggers:', error);
      if (error instanceof Error) {
        console.error('Error details:', error.message, error.stack);
      }
    }
  });

  console.log('Trigger checker cron job started');
}
