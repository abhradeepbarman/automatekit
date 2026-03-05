import { logger } from '@repo/common/utils';
import { Queue } from 'bullmq';
import 'dotenv/config';

export const triggerQueueName = 'trigger-checker';

export const triggerQueue = new Queue(triggerQueueName, {
  connection: {
    url: process.env.REDIS_URL,
  },
});

triggerQueue.on('error', (error) => {
  console.error('Queue error:', error);
});

logger.info('Trigger queue initialized');
