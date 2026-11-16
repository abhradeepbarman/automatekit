import { type ITrigger, SystemEvent } from '@repo/common/types';
import { webhookSchema, type WebhookConfig } from '../schemas';

export const webhook: ITrigger<WebhookConfig> = {
  id: SystemEvent.WEBHOOK,
  name: 'Webhook',
  description: 'Triggered when your webhook URL receives a request',
  icon: '/icons/webhook.svg',
  schema: webhookSchema,

  run: () => ({ success: true, message: 'Webhook triggered', statusCode: 200 }),
};
