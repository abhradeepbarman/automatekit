import z from 'zod';
import {
  type ITrigger,
  PollingInterval,
  type ReturnResponse,
} from '../../../types';
import { isIntervalPassed } from '../..';

export interface TimerMetadata {
  intervalMs: PollingInterval;
}

export const timer: ITrigger<TimerMetadata> = {
  id: 'timer',
  name: 'Timer',
  description: 'Triggered when a timer is set',
  fields: [
    {
      label: 'Interval',
      name: 'intervalMs',
      type: 'select',
      defaultValue: PollingInterval.FIVE_MINUTES,
      options: [
        {
          label: '1 min',
          value: PollingInterval.ONE_MINUTE,
        },
        {
          label: '5 min',
          value: PollingInterval.FIVE_MINUTES,
        },
        {
          label: '10 min',
          value: PollingInterval.TEN_MINUTES,
        },
      ],
      validations: () => z.string().min(1, 'Interval is required'),
    },
  ],

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
