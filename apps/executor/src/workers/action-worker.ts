import apps from '@repo/common/@apps';
import { ExecutionStatus, StepType, type IApp } from '@repo/common/types';
import { logger } from '@repo/common/utils';
import db from '@repo/db';
import { connections, steps, workflows } from '@repo/db/schema';
import { actionQueue, actionQueueName } from '@repo/queue';
import { Job, Worker } from 'bullmq';
import { and, eq } from 'drizzle-orm';
import config from '../config';
import { createExecutionLog } from '../helpers';
import { getRefreshTokenAndUpdate } from './trigger-worker';

export interface ActionJobData {
  stepIndex: number;
  workflowId: string;
  jobId: string;
  input?: unknown;
}

export const actionWorker = new Worker<ActionJobData>(
  actionQueueName,
  async (job: Job<ActionJobData>) => {
    const { stepIndex, jobId, workflowId, input } = job.data;
    try {
      const stepDetails = await db.query.steps.findFirst({
        where: and(
          eq(steps.index, stepIndex),
          eq(steps.workflowId, workflowId),
        ),
      });

      if (!stepDetails) {
        logger.error(`Step ${stepIndex} not found`);
        return;
      }

      if (stepDetails.type !== StepType.ACTION) {
        logger.error(`Step ${stepIndex} is not an action step`);
        return;
      }

      const workflowDetails = await db.query.workflows.findFirst({
        where: and(eq(workflows.id, workflowId)),
      });
      if (!workflowDetails) {
        logger.error(`Workflow ${workflowId} not found`);
        return;
      }

      const app: IApp | undefined = apps.find((a) => a.id === stepDetails.app);
      if (!app || !app.actions) {
        logger.error(`App ${stepDetails.app} not found`);
        return;
      }

      const actionDetails = app.actions.find(
        (a) => a.id === stepDetails.eventName,
      );
      if (!actionDetails) {
        logger.error(
          `Action ${stepDetails.eventName} not found in app ${stepDetails.app}`,
        );
        return;
      }

      const connectionDetails = await db.query.connections.findFirst({
        where: eq(connections.id, stepDetails.connectionId as string),
      });

      if (!connectionDetails) {
        logger.error(`Connection ${stepDetails.connectionId} not found`);
        return;
      }

      let result = await actionDetails.run({
        metadata: (stepDetails.metadata as any)?.data.fields,
        accessToken: connectionDetails.accessToken,
        input,
      });

      if (result.success && result.statusCode === 200) {
        await createExecutionLog(
          workflowId,
          app.id,
          actionDetails.id,
          StepType.ACTION,
          result.message ||
            `Action ${actionDetails.name} completed successfully`,
          jobId,
          ExecutionStatus.COMPLETED,
        );

        await actionQueue.add(actionQueueName, {
          stepIndex: stepIndex + 1,
          workflowId,
          jobId,
        });
      } else if (result.statusCode === 401) {
        try {
          const { access_token } = await getRefreshTokenAndUpdate(
            connectionDetails.id,
            app,
          );

          if (access_token) {
            result = await actionDetails.run({
              metadata: (stepDetails.metadata as any)?.data.fields,
              accessToken: access_token,
            });

            if (result.success && result.statusCode === 200) {
              await createExecutionLog(
                workflowId,
                app.id,
                actionDetails.id,
                StepType.ACTION,
                result.message ||
                  `Action ${actionDetails.name} completed successfully`,
                jobId,
                ExecutionStatus.COMPLETED,
              );

              await actionQueue.add(actionQueueName, {
                stepIndex: stepIndex + 1,
                workflowId,
                jobId,
              });
            } else {
              await createExecutionLog(
                workflowId,
                app.id,
                actionDetails.id,
                StepType.ACTION,
                'Failed after token refresh',
                jobId,
                ExecutionStatus.FAILED,
              );
            }
          }
        } catch (refreshError) {
          logger.error('Error refreshing token: ' + refreshError);
          await createExecutionLog(
            workflowId,
            app.id,
            actionDetails.id,
            StepType.ACTION,
            'Failed to refresh token',
            jobId,
            ExecutionStatus.FAILED,
          );
        }
      } else {
        logger.error(`Action ${actionDetails.name} failed: ${result.message}`);
        await createExecutionLog(
          workflowId,
          app.id,
          actionDetails.id,
          StepType.ACTION,
          result.message,
          jobId,
          ExecutionStatus.FAILED,
        );
      }
    } catch (error) {
      logger.error('Action worker error: ' + error);
    }
  },
  {
    connection: {
      url: config.REDIS_URL,
    },
    concurrency: 5,
  },
);

actionWorker.on('completed', (job) => {
  logger.info(`Job ${job.id} completed successfully`);
});

actionWorker.on('failed', (job, err) => {
  logger.error(`Job ${job?.id} failed: ${err.message}`);
});

actionWorker.on('error', (err) => {
  logger.error('Worker error: ' + err);
});

logger.info('Action Worker started');
