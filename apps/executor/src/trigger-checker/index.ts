import { SystemEvent, StepType } from '@repo/common/types';
import { logger } from '@repo/common/utils';
import db from '@repo/db';
import { steps, workflows } from '@repo/db/schema';
import { triggerQueue, triggerQueueName } from '@repo/queue';
import { and, eq, ne } from 'drizzle-orm';
import cron from 'node-cron';

const CRON_EXPRESSION = '* * * * *';

/**
 * Enqueues a poll each minute for every active, polling-triggered workflow.
 * Whether the interval has actually elapsed is decided by the trigger itself.
 */
export function startTriggerChecker() {
  const task = cron.schedule(CRON_EXPRESSION, async () => {
    try {
      // Webhook workflows are driven by inbound HTTP, so polling them would
      // enqueue a discarded job every minute.
      const dueWorkflows = await db
        .select({ id: workflows.id })
        .from(workflows)
        .innerJoin(steps, eq(steps.workflowId, workflows.id))
        .where(
          and(
            eq(workflows.isActive, true),
            eq(steps.index, 0),
            eq(steps.type, StepType.TRIGGER),
            ne(steps.eventName, SystemEvent.WEBHOOK),
          ),
        );

      if (dueWorkflows.length === 0) {
        return;
      }

      const minuteBucket = Math.floor(Date.now() / 60_000);

      await triggerQueue.addBulk(
        dueWorkflows.map((workflow) => ({
          name: triggerQueueName,
          data: { workflowId: workflow.id },
          opts: { jobId: `${workflow.id}:${minuteBucket}` },
        })),
      );

      logger.info(`Enqueued ${dueWorkflows.length} trigger check(s)`);
    } catch (error) {
      logger.error('Error checking triggers: ' + error);
    }
  });

  logger.info('Trigger checker cron job started');
  return task;
}
