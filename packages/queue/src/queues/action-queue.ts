import { logger } from '@repo/common/utils';
import { Queue } from 'bullmq';
import 'dotenv/config';

export const actionQueueName = 'action-execution';

export const actionQueue = new Queue(actionQueueName, {
  connection: {
    url: process.env.REDIS_URL,
  },
});

actionQueue.on('error', (error) => {
  console.error('Queue error:', error);
});

logger.info('Action queue initialized');
