import { logger } from '@repo/common/utils';
import db from '@repo/db';
import { workflows } from '@repo/db/schema';
import { eq } from 'drizzle-orm';
import cron from 'node-cron';
import { triggerQueue, triggerQueueName } from '@repo/queue';

export function startTriggerChecker() {
  cron.schedule('* * * * *', async () => {
    try {
      const activeWorkflows = await db.query.workflows.findMany({
        where: eq(workflows.isActive, true),
      });

      if (!activeWorkflows || activeWorkflows.length === 0) {
        logger.info('No active workflows found');
        return;
      }

      // add triggers for checks in queue - bulk
      await triggerQueue.addBulk(
        activeWorkflows.map((workflow) => ({
          name: triggerQueueName,
          data: {
            workflowId: workflow.id,
          },
        })),
      );
    } catch (error) {
      logger.error('Error checking triggers: ' + error);
    }
  });

  logger.info('Trigger checker cron job started');
}
