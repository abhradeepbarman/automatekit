import {
  ConnectionCredentials,
  ExecutionStatus,
  IApp,
  StepType,
  SystemEvent,
  TokenResponse,
} from '@repo/common/types';
import { decrypt, encrypt, logger } from '@repo/common/utils';
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
import { eq } from 'drizzle-orm';
import {
  createExecution,
  failExecution,
  finishExecutionStep,
  startExecutionStep,
} from '../helpers';

function hasValidAuth(
  app: IApp,
  connection: { expiresAt: Date | null } | null,
): boolean {
  if (!app.auth) return true;
  return Boolean(connection);
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

  const credentials = decrypt<ConnectionCredentials>(connection.credentials);
  if (!credentials.refreshToken) {
    throw new Error('Connection has no refresh token');
  }

  const tokens = await app.auth.refreshAccessToken(credentials.refreshToken);

  await db
    .update(connections)
    .set({
      credentials: encrypt({
        ...credentials,
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token ?? credentials.refreshToken,
      }),
      expiresAt: tokens.expires_in
        ? new Date(Date.now() + tokens.expires_in * 1000)
        : null,
    })
    .where(eq(connections.id, connectionId));

  return tokens;
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
              connection: true,
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

      if (
        triggerDetails.eventName === SystemEvent.WEBHOOK ||
        triggerDetails.eventName === SystemEvent.TAP
      ) {
        return;
      }

      const app = apps.find((app) => app.id === triggerDetails.integration);
      if (!app) {
        logger.error(`App ${triggerDetails.integration} not found`);
        return;
      }

      if (!app.triggers) {
        logger.error(`App ${triggerDetails.integration} has no triggers`);
        return;
      }

      if (!hasValidAuth(app, triggerDetails.connection)) {
        logger.error(`App ${triggerDetails.integration} has invalid auth`);
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

      const connection = triggerDetails.connection;
      let accessToken =
        app.auth && connection
          ? (decrypt<ConnectionCredentials>(connection.credentials)
              .accessToken ?? '')
          : '';

      const triggerMetadata = triggerDetails.config;
      const lastExecutedAt =
        workflowDetails.lastExecutedAt ?? workflowDetails.activatedAt ?? null;

      const runTrigger = () =>
        trigger.run({
          metadata: triggerMetadata,
          lastExecutedAt: lastExecutedAt as Date,
          accessToken,
        });

      let result = await runTrigger();
      if (result.skipped) {
        return;
      }

      if (!result.success && result.statusCode === 401 && connection) {
        logger.info('Refreshing token');
        try {
          const tokens = await getRefreshTokenAndUpdate(connection.id, app);
          accessToken = tokens.access_token;
          result = await runTrigger();
        } catch (refreshError) {
          logger.error('Failed to refresh token: ' + refreshError);
          result = {
            success: false,
            message: 'Failed to refresh token',
          } as typeof result;
        }
      }

      if (result.skipped) {
        return;
      }

      const executionId = await createExecution(workflowId, result.data);
      const executionStepId = await startExecutionStep(
        executionId,
        triggerDetails,
        triggerMetadata,
      );

      if (!result.success) {
        await failExecution(
          executionId,
          executionStepId,
          result.message || `Trigger ${trigger.name} failed`,
        );
        return;
      }

      await finishExecutionStep(executionStepId, {
        status: ExecutionStatus.COMPLETED,
        message: result.message || `Trigger ${trigger.name} successful`,
        output: result.data,
      });

      await actionQueue.add(actionQueueName, {
        workflowId,
        executionId,
        stepIndex: 1,
        dataAvailable: result.data,
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
