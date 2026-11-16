import { logger } from '@repo/common/utils';
import { Queue } from 'bullmq';
import { redisConnection } from '../connection';
import { defaultJobOptions } from '../job-options';

export interface ActionJobData {
  workflowId: string;
  stepIndex: number;
  executionId: string;
}

export const actionQueueName = 'action-execution';

export const actionQueue = new Queue<ActionJobData>(actionQueueName, {
  connection: redisConnection(),
  defaultJobOptions,
});

actionQueue.on('error', (error) => {
  logger.error('Action queue error: ' + error);
});

logger.info('Action queue initialized');
