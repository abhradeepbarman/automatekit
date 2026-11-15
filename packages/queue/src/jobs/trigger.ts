import { logger } from '@repo/common/utils';
import { Queue } from 'bullmq';
import { redisConnection } from '../connection';
import { defaultJobOptions } from '../job-options';

export interface TriggerJobData {
  workflowId: string;
  input?: unknown;
}

export const triggerQueueName = 'trigger-checker';

export const triggerQueue = new Queue<TriggerJobData>(triggerQueueName, {
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
