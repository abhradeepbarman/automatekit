import { logger } from '@repo/common/utils';
import { redisConnection } from '@repo/queue';
import { Worker, type Processor } from 'bullmq';

export const createWorker = <T>(
  queueName: string,
  label: string,
  processor: Processor<T>,
) => {
  const worker = new Worker<T>(queueName, processor, {
    connection: redisConnection(),
  });

  worker.on('completed', (job) => {
    logger.info(`${label} job ${job.id} completed`);
  });

  worker.on('failed', (job, error) => {
    logger.error(`${label} job ${job?.id} failed: ${error.message}`);
  });

  worker.on('error', (error) => {
    logger.error(`${label} worker error: ${error.message}`);
  });

  logger.info(`${label} worker started`);
  return worker;
};
