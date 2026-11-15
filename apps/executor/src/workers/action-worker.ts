import {
  ConnectionCredentials,
  ExecutionStatus,
  StepType,
  type IApp,
} from '@repo/common/types';
import { decrypt, logger } from '@repo/common/utils';
import db from '@repo/db';
import { connections, steps, workflows } from '@repo/db/schema';
import apps from '@repo/integrations';
import {
  actionQueue,
  actionQueueName,
  redisConnection,
  type ActionJobData,
} from '@repo/queue';
import { Job, Worker } from 'bullmq';
import { and, eq } from 'drizzle-orm';
import {
  failExecution,
  finishExecution,
  finishExecutionStep,
  replaceVariables,
  startExecutionStep,
} from '../helpers';
import { getRefreshTokenAndUpdate } from './trigger-worker';

export const actionWorker = new Worker<ActionJobData>(
  actionQueueName,
  async (job: Job<ActionJobData>) => {
    const { stepIndex, executionId, workflowId, dataAvailable } = job.data;

    const workflowDetails = await db.query.workflows.findFirst({
      where: eq(workflows.id, workflowId),
    });
    if (!workflowDetails) {
      logger.error(`Workflow ${workflowId} not found`);
      return;
    }

    if (!workflowDetails.isActive) {
      await finishExecution(
        executionId,
        ExecutionStatus.FAILED,
        'Workflow was deactivated',
      );
      return;
    }

    const stepDetails = await db.query.steps.findFirst({
      where: and(eq(steps.index, stepIndex), eq(steps.workflowId, workflowId)),
    });

    if (!stepDetails) {
      logger.info(`Workflow ${workflowId} run ${executionId} completed`);
      await finishExecution(executionId, ExecutionStatus.COMPLETED);
      return;
    }

    const rawFields = stepDetails.config;
    const input = replaceVariables(rawFields, dataAvailable);
    const executionStepId = await startExecutionStep(
      executionId,
      stepDetails,
      input,
    );
    const fail = (message: string) =>
      failExecution(executionId, executionStepId, message);

    if (stepDetails.type !== StepType.ACTION) {
      return fail(`Step ${stepIndex} is not an action step`);
    }

    const app: IApp | undefined = apps.find(
      (a) => a.id === stepDetails.integration,
    );
    const action = app?.actions?.find((a) => a.id === stepDetails.eventName);
    if (!app || !action) {
      return fail(
        `Action ${stepDetails.eventName} not found in ${stepDetails.integration}`,
      );
    }

    let accessToken = '';
    if (app.auth) {
      if (!stepDetails.connectionId) {
        return fail('Step has no connected account');
      }

      const connection = await db.query.connections.findFirst({
        where: eq(connections.id, stepDetails.connectionId),
      });
      if (!connection) {
        return fail('Connected account no longer exists');
      }

      accessToken =
        decrypt<ConnectionCredentials>(connection.credentials).accessToken ??
        '';
    }

    let result = await action.run({ metadata: input, accessToken });

    if (
      !result.success &&
      result.statusCode === 401 &&
      stepDetails.connectionId
    ) {
      try {
        const tokens = await getRefreshTokenAndUpdate(
          stepDetails.connectionId,
          app,
        );
        result = await action.run({
          metadata: input,
          accessToken: tokens.access_token,
        });
      } catch (refreshError) {
        logger.error('Error refreshing token: ' + refreshError);
        return fail('Failed to refresh token');
      }
    }

    if (!result.success) {
      logger.error(`Action ${action.name} failed: ${result.message}`);
      return fail(result.message || `Action ${action.name} failed`);
    }

    await finishExecutionStep(executionStepId, {
      status: ExecutionStatus.COMPLETED,
      message: result.message || `Action ${action.name} completed successfully`,
      output: result.data,
    });

    await actionQueue.add(actionQueueName, {
      workflowId,
      executionId,
      stepIndex: stepIndex + 1,
      dataAvailable: result.data,
    });
  },
  {
    connection: redisConnection(),
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
