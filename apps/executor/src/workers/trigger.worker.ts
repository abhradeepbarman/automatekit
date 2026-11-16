import { ExecutionStatus, StepType } from '@repo/common/types';
import { logger } from '@repo/common/utils';
import db from '@repo/db';
import { steps, workflows } from '@repo/db/schema';
import apps from '@repo/integrations';
import {
  actionQueue,
  actionQueueName,
  triggerQueueName,
  type TriggerJobData,
} from '@repo/queue';
import type { Job } from 'bullmq';
import { and, eq } from 'drizzle-orm';
import { INSTANT_TRIGGER_EVENTS } from '../constants';
import {
  createExecution,
  failExecution,
  finishExecutionStep,
  runWithAuth,
  startExecutionStep,
} from '../services';
import { createWorker } from '../utils';

const processTriggerJob = async (job: Job<TriggerJobData>) => {
  const { workflowId } = job.data;

  const workflow = await db.query.workflows.findFirst({
    where: eq(workflows.id, workflowId),
    with: {
      steps: {
        where: and(eq(steps.type, StepType.TRIGGER), eq(steps.index, 0)),
        with: { connection: true },
      },
    },
  });
  if (!workflow) {
    logger.error(`Workflow ${workflowId} not found`);
    return;
  }

  const [step] = workflow.steps;
  if (
    !workflow.isActive ||
    !step ||
    INSTANT_TRIGGER_EVENTS.includes(step.eventName)
  ) {
    return;
  }

  const app = apps.find((app) => app.id === step.integration);
  const trigger = app?.triggers?.find(
    (trigger) => trigger.id === step.eventName,
  );
  if (!app || !trigger) {
    logger.error(`Trigger ${step.integration}/${step.eventName} not found`);
    return;
  }

  if (app.auth && !step.connection) {
    logger.error(`Workflow ${workflowId} trigger has no connected account`);
    return;
  }

  const result = await runWithAuth(app, step.connection, (accessToken) =>
    trigger.run({
      metadata: step.config,
      lastExecutedAt: workflow.lastExecutedAt ?? workflow.activatedAt,
      accessToken,
    }),
  );
  if (result.skipped) return;

  const executionId = await createExecution(workflowId, result.data);
  const executionStepId = await startExecutionStep(
    executionId,
    step,
    step.config,
  );

  if (!result.success) {
    await failExecution(
      executionId,
      executionStepId,
      result.message || `${trigger.name} failed`,
    );
    return;
  }

  await finishExecutionStep(executionStepId, {
    status: ExecutionStatus.COMPLETED,
    message: result.message || `${trigger.name} triggered`,
    output: result.data,
  });

  await actionQueue.add(actionQueueName, {
    workflowId,
    executionId,
    stepIndex: 1,
  });
};

export const triggerWorker = createWorker(
  triggerQueueName,
  'Trigger',
  processTriggerJob,
);
