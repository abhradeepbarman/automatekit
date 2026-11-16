import { StepType } from '@repo/common/types';
import { logger } from '@repo/common/utils';
import db from '@repo/db';
import { steps, workflows } from '@repo/db/schema';
import { triggerQueue, triggerQueueName } from '@repo/queue';
import { and, eq, notInArray } from 'drizzle-orm';
import cron from 'node-cron';
import { INSTANT_TRIGGER_EVENTS, TRIGGER_POLL_CRON } from '../constants';

const enqueuePollingTriggers = async () => {
  const pollingWorkflows = await db
    .select({ id: workflows.id })
    .from(workflows)
    .innerJoin(steps, eq(steps.workflowId, workflows.id))
    .where(
      and(
        eq(workflows.isActive, true),
        eq(steps.index, 0),
        eq(steps.type, StepType.TRIGGER),
        notInArray(steps.eventName, INSTANT_TRIGGER_EVENTS),
      ),
    );

  if (pollingWorkflows.length === 0) return;

  const minuteBucket = Math.floor(Date.now() / 60_000);

  await triggerQueue.addBulk(
    pollingWorkflows.map((workflow) => ({
      name: triggerQueueName,
      data: { workflowId: workflow.id },
      opts: { jobId: `${workflow.id}:${minuteBucket}` },
    })),
  );

  logger.info(`Enqueued ${pollingWorkflows.length} trigger check(s)`);
};

export const startTriggerChecker = () => {
  const task = cron.schedule(TRIGGER_POLL_CRON, async () => {
    try {
      await enqueuePollingTriggers();
    } catch (error) {
      logger.error(`Trigger checker failed: ${error}`);
    }
  });

  logger.info('Trigger checker started');
  return task;
};
