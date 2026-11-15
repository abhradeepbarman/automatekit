import { type ITrigger, SystemEvent } from '@repo/common/types';
import { webhookSchema, type WebhookConfig } from '../schemas';

export const webhook: ITrigger<WebhookConfig> = {
  id: SystemEvent.WEBHOOK,
  name: 'Webhook',
  description: 'Triggered when your webhook URL receives a request',
  schema: webhookSchema,
  dataAvailable: [
    { key: 'body', label: 'Body', type: 'object' },
    { key: 'query', label: 'Query parameters', type: 'object' },
    { key: 'headers', label: 'Headers', type: 'object' },
  ],

  run: () => ({ success: true, message: 'Webhook triggered', statusCode: 200 }),
};
