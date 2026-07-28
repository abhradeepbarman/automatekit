import { logger } from '@repo/common/utils';
import { Queue } from 'bullmq';
import 'dotenv/config';
import { defaultJobOptions, redisConnection } from './connection';

export const actionQueueName = 'action-execution';

export const actionQueue = new Queue(actionQueueName, {
  connection: redisConnection(),
  defaultJobOptions,
});

actionQueue.on('error', (error) => {
  logger.error('Action queue error: ' + error);
});

logger.info('Action queue initialized');
