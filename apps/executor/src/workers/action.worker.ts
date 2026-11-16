import { ExecutionStatus, StepType } from '@repo/common/types';
import { logger } from '@repo/common/utils';
import db from '@repo/db';
import { steps, workflows } from '@repo/db/schema';
import apps from '@repo/integrations';
import { actionQueue, actionQueueName, type ActionJobData } from '@repo/queue';
import type { Job } from 'bullmq';
import { and, eq } from 'drizzle-orm';
import {
  failExecution,
  finishExecution,
  finishExecutionStep,
  runWithAuth,
  startExecutionStep,
} from '../services';
import { createWorker } from '../utils';

const processActionJob = async (job: Job<ActionJobData>) => {
  const { workflowId, executionId, stepIndex } = job.data;

  const workflow = await db.query.workflows.findFirst({
    where: eq(workflows.id, workflowId),
  });
  if (!workflow) {
    logger.error(`Workflow ${workflowId} not found`);
    return;
  }

  if (!workflow.isActive) {
    await finishExecution(
      executionId,
      ExecutionStatus.FAILED,
      'Workflow was deactivated',
    );
    return;
  }

  const step = await db.query.steps.findFirst({
    where: and(eq(steps.workflowId, workflowId), eq(steps.index, stepIndex)),
    with: { connection: true },
  });
  if (!step) {
    await finishExecution(executionId, ExecutionStatus.COMPLETED);
    logger.info(`Execution ${executionId} completed`);
    return;
  }

  const executionStepId = await startExecutionStep(
    executionId,
    step,
    step.config,
  );
  const fail = (message: string) =>
    failExecution(executionId, executionStepId, message);

  const app = apps.find((app) => app.id === step.integration);
  const action =
    step.type === StepType.ACTION
      ? app?.actions?.find((action) => action.id === step.eventName)
      : undefined;
  if (!app || !action) {
    return fail(`Action ${step.integration}/${step.eventName} not found`);
  }

  if (app.auth && !step.connection) {
    return fail('Step has no connected account');
  }

  const result = await runWithAuth(app, step.connection, (accessToken) =>
    action.run({ metadata: step.config, accessToken }),
  );
  if (!result.success) {
    return fail(result.message || `${action.name} failed`);
  }

  await finishExecutionStep(executionStepId, {
    status: ExecutionStatus.COMPLETED,
    message: result.message || `${action.name} completed`,
    output: result.data,
  });

  await actionQueue.add(actionQueueName, {
    workflowId,
    executionId,
    stepIndex: stepIndex + 1,
  });
};

export const actionWorker = createWorker(
  actionQueueName,
  'Action',
  processActionJob,
);
