import 'dotenv/config';
import { logger } from '@repo/common/utils';
import { actionQueue, triggerQueue } from '@repo/queue';
import config from './config';
import { startTriggerChecker } from './trigger-checker';
import { actionWorker } from './workers/action-worker';
import { triggerWorker } from './workers/trigger-worker';

const triggerChecker = startTriggerChecker();

logger.info('Executor started');

let shuttingDown = false;

const shutdown = async (signal: string) => {
  if (shuttingDown) return;
  shuttingDown = true;

  logger.info(`Received ${signal}, shutting down executor...`);

  const timeout = setTimeout(() => {
    logger.error('Graceful shutdown timed out, forcing exit');
    process.exit(1);
  }, config.SHUTDOWN_TIMEOUT_MS);

  try {
    triggerChecker.stop();
    await Promise.all([actionWorker.close(), triggerWorker.close()]);
    await Promise.all([actionQueue.close(), triggerQueue.close()]);
    clearTimeout(timeout);
    logger.info('Executor shut down cleanly');
    process.exit(0);
  } catch (error) {
    logger.error('Error during shutdown: ' + error);
    clearTimeout(timeout);
    process.exit(1);
  }
};

process.on('SIGTERM', () => void shutdown('SIGTERM'));
process.on('SIGINT', () => void shutdown('SIGINT'));

process.on('unhandledRejection', (reason) => {
  logger.error('Unhandled rejection in executor: ' + reason);
});
