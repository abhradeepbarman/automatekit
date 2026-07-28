import { logger } from '@repo/common/utils';
import { Queue } from 'bullmq';
import 'dotenv/config';
import { defaultJobOptions, redisConnection } from './connection';

export const triggerQueueName = 'trigger-checker';

export const triggerQueue = new Queue(triggerQueueName, {
  connection: redisConnection(),
  defaultJobOptions: {
    ...defaultJobOptions,
    attempts: 1,
  },
});

triggerQueue.on('error', (error) => {
  logger.error('Trigger queue error: ' + error);
});

logger.info('Trigger queue initialized');
