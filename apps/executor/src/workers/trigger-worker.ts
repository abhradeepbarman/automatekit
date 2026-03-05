import apps from '@repo/common/@apps';
import {
  ExecutionStatus,
  IApp,
  StepType,
  TokenResponse,
} from '@repo/common/types';
import { logger } from '@repo/common/utils';
import db from '@repo/db';
import { connections, steps, workflows } from '@repo/db/schema';
import { actionQueue, actionQueueName, triggerQueueName } from '@repo/queue';
import { Job, Worker } from 'bullmq';
import { and, eq } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { createExecutionLog } from '../helpers';
import config from '../config';

interface TriggerJobData {
  workflowId: string;
}

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

export async function getRefreshTokenAndUpdate(
  connectionId: string,
  app: IApp,
): Promise<TokenResponse> {
  const connection = await db.query.connections.findFirst({
    where: eq(connections.id, connectionId),
  });

  if (!connection) {
    throw new Error('Connection not found');
  }

  if (!app.auth) {
    throw new Error('App has no auth');
  }

  if (!connection.refreshToken) {
    throw new Error('Connection has no refresh token');
  }

  const { access_token, refresh_token, expires_in } =
    await app.auth.refreshAccessToken(connection.refreshToken);

  await db
    .update(connections)
    .set({
      accessToken: access_token,
      refreshToken: refresh_token,
      expiresAt: new Date(Date.now() + expires_in * 1000),
    })
    .where(eq(connections.id, connectionId));

  return { access_token, refresh_token, expires_in };
}

export const triggerWorker = new Worker<TriggerJobData>(
  triggerQueueName,
  async (job: Job<TriggerJobData>) => {
    try {
      const workflowId = job.data.workflowId;
      if (!workflowId) {
        logger.error('Workflow ID not found');
        return;
      }

      const workflowDetails = await db.query.workflows.findFirst({
        where: and(eq(workflows.id, workflowId)),
        with: {
          steps: {
            where: eq(steps.type, StepType.TRIGGER),
            with: {
              connections: true,
            },
          },
        },
      });

      if (!workflowDetails) {
        logger.error('Workflow not found');
        return;
      }

      const triggerDetails = workflowDetails.steps.find(
        (step) => step.index === 0,
      );
      if (!triggerDetails) {
        logger.error('Workflow has no trigger step');
        return;
      }

      const app = apps.find((app) => app.id === triggerDetails.app);
      if (!app) {
        logger.error(`App ${triggerDetails.app} not found`);
        return;
      }

      if (!app.triggers) {
        logger.error(`App ${triggerDetails.app} has no triggers`);
        return;
      }

      if (!hasValidAuth(app, triggerDetails)) {
        logger.error(`App ${triggerDetails.app} has invalid auth`);
        return;
      }

      const trigger = app.triggers.find(
        (trigger) => trigger.id === triggerDetails.name,
      );
      if (!trigger) {
        logger.error(`Trigger ${triggerDetails.name} not found`);
        return;
      }

      logger.info(
        `Triggering ${triggerDetails.name} for workflow ${workflowId}`,
      );

      const jobId = nanoid();

      let { success, message, statusCode } = await trigger.run(
        (triggerDetails.metadata as any).data.fields,
        workflowDetails.lastExecutedAt,
        triggerDetails.connections?.accessToken || '',
      );

      if (success && statusCode === 200) {
        await createExecutionLog(
          workflowDetails.id,
          triggerDetails.id,
          message || `Trigger ${triggerDetails.name} completed successfully`,
          jobId,
          ExecutionStatus.COMPLETED,
        );

        await actionQueue.add(actionQueueName, {
          stepIndex: 1,
          workflowId,
          jobId,
        });
      } else if (!success && statusCode === 401) {
        logger.info('Refreshing token');

        let access_token: string | undefined;
        try {
          ({ access_token } = await getRefreshTokenAndUpdate(
            triggerDetails.connectionId!,
            app,
          ));
        } catch (refreshError) {
          logger.error('Failed to refresh token: ' + refreshError);
          await createExecutionLog(
            workflowDetails.id,
            triggerDetails.id,
            'Failed to refresh token',
            jobId,
            ExecutionStatus.FAILED,
          );
          return;
        }

        const retryResult = await trigger.run(
          (triggerDetails.metadata as any).data.fields,
          workflowDetails.lastExecutedAt,
          access_token,
        );

        if (retryResult.success && retryResult.statusCode === 200) {
          await createExecutionLog(
            workflowDetails.id,
            triggerDetails.id,
            retryResult.message ||
              `Trigger ${trigger.name} completed successfully`,
            jobId,
            ExecutionStatus.COMPLETED,
          );

          await actionQueue.add(actionQueueName, {
            stepIndex: 1,
            workflowId,
            jobId,
          });
        } else {
          logger.error(retryResult.message);
          await createExecutionLog(
            workflowDetails.id,
            triggerDetails.id,
            retryResult.message || `Trigger ${trigger.name} failed`,
            jobId,
            ExecutionStatus.FAILED,
          );
        }
      } else {
        await createExecutionLog(
          workflowDetails.id,
          triggerDetails.id,
          message || `Trigger ${trigger.name} failed`,
          jobId,
          ExecutionStatus.FAILED,
        );
      }

      await db
        .update(workflows)
        .set({ lastExecutedAt: new Date() })
        .where(eq(workflows.id, workflowId));
    } catch (error) {
      logger.error('Trigger worker error: ' + error);
    }
  },
  {
    connection: {
      url: config.REDIS_URL,
    },
    concurrency: 5,
  },
);

triggerWorker.on('completed', (job) => {
  logger.info(`Job ${job.id} completed successfully`);
});

triggerWorker.on('failed', (job, err) => {
  logger.error(`Job ${job?.id} failed: ${err.message}`);
});

triggerWorker.on('error', (err) => {
  logger.error('Worker error: ' + err);
});

logger.info('Trigger Worker started');
