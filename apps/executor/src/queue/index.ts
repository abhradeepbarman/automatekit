import { Queue } from 'bullmq';
import config from '../config';

export const queueName = 'action-execution';

export const actionQueue = new Queue(queueName, {
  connection: {
    url: config.REDIS_URL,
  },
});

actionQueue.on('error', (error) => {
  console.error('Queue error:', error);
});

console.log('Queue initialized');
