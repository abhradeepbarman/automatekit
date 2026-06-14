import { z } from 'zod';
import {
  type ITrigger,
  PollingInterval,
  type ReturnResponse,
  SystemEvent,
} from '@repo/common/types';
import { isIntervalPassed } from '../../../lib/interval';

// Shared by the frontend form and backend step validation.
export const timerSchema = z.object({
  intervalMs: z.string().min(1, 'Interval is required'),
});

export interface TimerMetadata {
  intervalMs: PollingInterval;
}

export const timer: ITrigger<TimerMetadata> = {
  id: SystemEvent.TIMER,
  name: 'Timer',
  description: 'Triggered when a timer is set',

  schema: timerSchema,

  run: ({ metadata, lastExecutedAt }): ReturnResponse => {
    try {
      if (!lastExecutedAt)
        return {
          success: true,
          message: 'Timer triggered',
          statusCode: 200,
        };

      if (isIntervalPassed(lastExecutedAt, Number(metadata.intervalMs))) {
        return {
          success: true,
          message: 'Timer triggered',
          statusCode: 200,
        };
      }

      return {
        success: false,
        message: 'Timer not triggered',
        statusCode: 400,
      };
    } catch (error) {
      console.error('Error executing timer trigger:', error);
      return {
        success: false,
        message: 'Error executing timer trigger',
        statusCode: 500,
      };
    }
  },
};
