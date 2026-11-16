import { SystemEvent } from '@repo/common/types';

export const TRIGGER_POLL_CRON = '* * * * *';

export const INSTANT_TRIGGER_EVENTS: string[] = [
  SystemEvent.WEBHOOK,
  SystemEvent.TAP,
];
