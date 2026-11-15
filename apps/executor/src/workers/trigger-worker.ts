import {
  ExecutionStatus,
  IApp,
  StepType,
  SystemEvent,
  TokenResponse,
} from '@repo/common/types';
import { decryptSymmetric, encryptSymmetric, logger } from '@repo/common/utils';
import db from '@repo/db';
import { connections, steps, workflows } from '@repo/db/schema';
import apps from '@repo/integrations';
import {
  actionQueue,
  actionQueueName,
  redisConnection,
  triggerQueueName,
  type TriggerJobData,
} from '@repo/queue';
import { Job, Worker } from 'bullmq';
import { randomUUID } from 'crypto';
import { eq } from 'drizzle-orm';
import { createExecutionLog } from '../helpers';

function hasValidAuth(app: IApp, triggerDetails: any): boolean {
  if (!app.auth) {
    return true;
  }

  if (
    !triggerDetails.connections ||
    !triggerDetails.connections.accessTokenEncrypt
  ) {
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

  if (!connection.refreshTokenEncrypt) {
    throw new Error('Connection has no refresh token');
  }

  const decryptedRefreshToken = decryptSymmetric(
    connection.refreshTokenEncrypt,
    connection.refreshTokenIV!,
    connection.refreshTokenTag!,
  );

  const { access_token, refresh_token, expires_in } =
    await app.auth.refreshAccessToken(decryptedRefreshToken);

  const {
    ciphertext: encryptedAccessToken,
    iv: accessIV,
    tag: accessTag,
  } = encryptSymmetric(access_token);
  const {
    ciphertext: encryptedRefreshToken,
    iv: refreshIV,
    tag: refreshTag,
  } = encryptSymmetric(refresh_token ?? '');

  await db
    .update(connections)
    .set({
      accessTokenEncrypt: encryptedAccessToken,
      accessTokenIV: accessIV,
      accessTokenTag: accessTag,

      refreshTokenEncrypt: encryptedRefreshToken,
      refreshTokenIV: refreshIV,
      refreshTokenTag: refreshTag,

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
        where: eq(workflows.id, workflowId),
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

      if (!workflowDetails.isActive) {
        logger.info(`Workflow ${workflowId} is not active, skipping poll`);
        return;
      }

      const triggerDetails = workflowDetails.steps.find(
        (step) => step.index === 0,
      );
      if (!triggerDetails) {
        logger.error('Workflow has no trigger step');
        return;
      }

      if (triggerDetails.eventName === SystemEvent.WEBHOOK) {
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
        (trigger) => trigger.id === triggerDetails.eventName,
      );
      if (!trigger) {
        logger.error(`Trigger ${triggerDetails.eventName} not found`);
        return;
      }

      logger.info(
        `Triggering ${triggerDetails.eventName} for workflow ${workflowId}`,
      );

      const jobId = randomUUID();

      const connection = triggerDetails.connections;
      let decryptedAccessToken =
        app.auth && connection?.accessTokenEncrypt
          ? decryptSymmetric(
              connection.accessTokenEncrypt,
              connection.accessTokenIV,
              connection.accessTokenTag,
            )
          : '';

      const triggerMetadata =
        (triggerDetails.metadata as any)?.data?.fields ?? {};
      const lastExecutedAt =
        workflowDetails.lastExecutedAt ?? workflowDetails.activatedAt ?? null;

      const runResult = await trigger.run({
        metadata: triggerMetadata,
        lastExecutedAt: lastExecutedAt as Date,
        accessToken: decryptedAccessToken,
      });

      if (runResult.skipped) {
        return;
      }

      let { success, message, statusCode, data } = runResult;

      let dataToPass = data;
      if (!success && statusCode === 401) {
        logger.info('Refreshing token');

        try {
          const tokenResonse = await getRefreshTokenAndUpdate(
            triggerDetails.connectionId!,
            app,
          );
          decryptedAccessToken = tokenResonse.access_token;

          const retryResult = await trigger.run({
            metadata: triggerMetadata,
            lastExecutedAt: lastExecutedAt as Date,
            accessToken: decryptedAccessToken,
          });

          if (!retryResult.success) {
            logger.error(retryResult.message);
            await createExecutionLog(
              workflowDetails.id,
              app.id,
              triggerDetails.id,
              trigger.id,
              StepType.TRIGGER,
              retryResult.message || `Trigger ${trigger.name} failed`,
              jobId,
              ExecutionStatus.FAILED,
            );
            return;
          }

          dataToPass = retryResult.data;
        } catch (refreshError) {
          logger.error('Failed to refresh token: ' + refreshError);
          await createExecutionLog(
            workflowDetails.id,
            app.id,
            triggerDetails.id,
            trigger.id,
            StepType.TRIGGER,
            'Failed to refresh token',
            jobId,
            ExecutionStatus.FAILED,
          );
          return;
        }
      } else if (!success) {
        await createExecutionLog(
          workflowDetails.id,
          app.id,
          triggerDetails.id,
          trigger.id,
          StepType.TRIGGER,
          message || `Trigger ${trigger.name} failed`,
          jobId,
          ExecutionStatus.FAILED,
        );
        return;
      }

      await createExecutionLog(
        workflowDetails.id,
        app.id,
        triggerDetails.id,
        trigger.id,
        StepType.TRIGGER,
        message || `Trigger ${trigger.name} successful`,
        jobId,
        ExecutionStatus.COMPLETED,
      );

      await db
        .update(workflows)
        .set({ lastExecutedAt: new Date() })
        .where(eq(workflows.id, workflowId));

      await actionQueue.add(actionQueueName, {
        stepIndex: 1,
        workflowId,
        jobId,
        dataAvailable: dataToPass,
      });
    } catch (error) {
      logger.error('Trigger worker error: ' + error);
    }
  },
  {
    connection: redisConnection(),
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
