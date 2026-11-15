import type { z } from 'zod';
import { type ITrigger, SystemEvent } from '@repo/common/types';
import { timerSchema } from '../schemas';

export const timer: ITrigger<z.infer<typeof timerSchema>> = {
  id: SystemEvent.TIMER,
  name: 'Timer',
  description: 'Triggered when a timer is set',
  icon: '/icons/timer.svg',
  schema: timerSchema,

  run: ({ metadata, lastExecutedAt }) => {
    const due =
      !lastExecutedAt ||
      Date.now() >=
        new Date(lastExecutedAt).getTime() + Number(metadata.intervalMs);

    return due
      ? { success: true, message: 'Timer triggered', statusCode: 200 }
      : {
          success: false,
          skipped: true,
          message: 'Timer interval has not elapsed',
          statusCode: 200,
        };
  },
};
