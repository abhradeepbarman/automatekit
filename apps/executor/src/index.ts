import 'dotenv/config';
import { logger } from '@repo/common/utils';
import { actionQueue, triggerQueue } from '@repo/queue';
import { startTriggerChecker } from './cron/trigger-checker';
import { actionWorker, triggerWorker } from './workers';

const triggerChecker = startTriggerChecker();

logger.info('Executor started');

let shuttingDown = false;

const shutdown = async (signal: NodeJS.Signals) => {
  if (shuttingDown) return;
  shuttingDown = true;

  logger.info(`Received ${signal}, shutting down executor`);

  try {
    await triggerChecker.stop();
    await Promise.all([actionWorker.close(), triggerWorker.close()]);
    await Promise.all([actionQueue.close(), triggerQueue.close()]);
    logger.info('Executor shut down cleanly');
    process.exit(0);
  } catch (error) {
    logger.error(`Executor shutdown failed: ${error}`);
    process.exit(1);
  }
};

process.on('SIGTERM', () => void shutdown('SIGTERM'));
process.on('SIGINT', () => void shutdown('SIGINT'));

process.on('unhandledRejection', (reason) => {
  logger.error(`Unhandled rejection: ${reason}`);
});
