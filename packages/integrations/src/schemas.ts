import type { z } from 'zod';
import { AppType, SystemEvent } from '@repo/common/types';
import { sendEmailSchema } from './apps/gmail/actions/send-email';
import { timerSchema } from './apps/system/triggers/timer';

// Client-safe metadata schemas, keyed by `app:event`. Used by both the frontend
// forms and backend step validation. To add an event, register its schema here.
const appSchemas: Record<string, Record<string, z.ZodType>> = {
  [AppType.GMAIL]: {
    'send-email': sendEmailSchema,
  },
  [AppType.SYSTEM]: {
    [SystemEvent.TIMER]: timerSchema,
  },
};

export const getEventSchema = (appId: string, eventId: string) =>
  appSchemas[appId]?.[eventId];

export { sendEmailSchema, timerSchema };
