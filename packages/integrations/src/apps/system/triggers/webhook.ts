import { type ITrigger, SystemEvent } from '@repo/common/types';

export const webhook: ITrigger = {
  id: SystemEvent.WEBHOOK,
  name: 'Webhook',
  description: 'Triggered when a webhook is received',
  dataAvailable: [{ key: 'input', label: 'Input', type: 'object' }],

  run: () => ({ success: true, message: 'Webhook triggered', statusCode: 200 }),
};
