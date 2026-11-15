import apps from '@repo/integrations';
import { ExecutionStatus, StepType, type IApp } from '@repo/common/types';
import { decryptSymmetric, logger } from '@repo/common/utils';
import db from '@repo/db';
import { connections, steps, workflows } from '@repo/db/schema';
import {
  actionQueue,
  actionQueueName,
  redisConnection,
  type ActionJobData,
} from '@repo/queue';
import { Job, Worker } from 'bullmq';
import { and, eq } from 'drizzle-orm';
import { createExecutionLog, replaceVariables } from '../helpers';
import { getRefreshTokenAndUpdate } from './trigger-worker';

export const actionWorker = new Worker<ActionJobData>(
  actionQueueName,
  async (job: Job<ActionJobData>) => {
    const { stepIndex, jobId, workflowId, dataAvailable } = job.data;

    const stepDetails = await db.query.steps.findFirst({
      where: and(eq(steps.index, stepIndex), eq(steps.workflowId, workflowId)),
    });

    if (!stepDetails) {
      logger.info(
        `Workflow ${workflowId} finished: no step at index ${stepIndex}`,
      );
      return;
    }

    if (stepDetails.type !== StepType.ACTION) {
      logger.error(`Step ${stepIndex} is not an action step`);
      return;
    }

    const workflowDetails = await db.query.workflows.findFirst({
      where: eq(workflows.id, workflowId),
    });
    if (!workflowDetails) {
      logger.error(`Workflow ${workflowId} not found`);
      return;
    }

    if (!workflowDetails.isActive) {
      logger.info(`Workflow ${workflowId} is not active, skipping step`);
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

    if (!stepDetails.connectionId) {
      logger.error(`Step ${stepDetails.id} has no connection`);
      await createExecutionLog(
        workflowId,
        app.id,
        stepDetails.id,
        actionDetails.id,
        StepType.ACTION,
        'Step has no connected account',
        jobId,
        ExecutionStatus.FAILED,
      );
      return;
    }

    const connectionDetails = await db.query.connections.findFirst({
      where: eq(connections.id, stepDetails.connectionId),
    });

    if (!connectionDetails) {
      logger.error(`Connection ${stepDetails.connectionId} not found`);
      await createExecutionLog(
        workflowId,
        app.id,
        stepDetails.id,
        actionDetails.id,
        StepType.ACTION,
        'Connected account no longer exists',
        jobId,
        ExecutionStatus.FAILED,
      );
      return;
    }

    const decryptedAccessToken = decryptSymmetric(
      connectionDetails.accessTokenEncrypt,
      connectionDetails.accessTokenIV,
      connectionDetails.accessTokenTag,
    );

    const rawFields = (stepDetails.metadata as any)?.data?.fields ?? {};
    const metadata = replaceVariables(rawFields, dataAvailable);

    let result = await actionDetails.run({
      metadata,
      accessToken: decryptedAccessToken,
    });

    let dataToPass = result.data;

    if (!result.success && result.statusCode === 401) {
      try {
        const { access_token } = await getRefreshTokenAndUpdate(
          connectionDetails.id,
          app,
        );

        if (!access_token) {
          await createExecutionLog(
            workflowId,
            app.id,
            stepDetails.id,
            actionDetails.id,
            StepType.ACTION,
            'Failed to refresh token',
            jobId,
            ExecutionStatus.FAILED,
          );
          return;
        }

        result = await actionDetails.run({
          metadata,
          accessToken: access_token,
        });

        if (!result.success) {
          await createExecutionLog(
            workflowId,
            app.id,
            stepDetails.id,
            actionDetails.id,
            StepType.ACTION,
            result.message || 'Failed after token refresh',
            jobId,
            ExecutionStatus.FAILED,
          );
          return;
        }

        dataToPass = result.data;
      } catch (refreshError) {
        logger.error('Error refreshing token: ' + refreshError);
        await createExecutionLog(
          workflowId,
          app.id,
          stepDetails.id,
          actionDetails.id,
          StepType.ACTION,
          'Failed to refresh token',
          jobId,
          ExecutionStatus.FAILED,
        );
        return;
      }
    } else if (!result.success) {
      logger.error(`Action ${actionDetails.name} failed: ${result.message}`);
      await createExecutionLog(
        workflowId,
        app.id,
        stepDetails.id,
        actionDetails.id,
        StepType.ACTION,
        result.message,
        jobId,
        ExecutionStatus.FAILED,
      );
      return;
    }

    await createExecutionLog(
      workflowId,
      app.id,
      stepDetails.id,
      actionDetails.id,
      StepType.ACTION,
      result.message || `Action ${actionDetails.name} completed successfully`,
      jobId,
      ExecutionStatus.COMPLETED,
    );

    const nextStep = await db.query.steps.findFirst({
      where: and(
        eq(steps.index, stepIndex + 1),
        eq(steps.workflowId, workflowId),
      ),
    });

    if (!nextStep) {
      logger.info(`Workflow ${workflowId} run ${jobId} completed`);
      return;
    }

    await actionQueue.add(actionQueueName, {
      stepIndex: stepIndex + 1,
      workflowId,
      jobId,
      dataAvailable: dataToPass,
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
