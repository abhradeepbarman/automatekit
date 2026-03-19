import { type ITrigger } from '../../../types';

export interface IWebhookMetadata {
  workflowId: string;
  path: string;
  input: unknown;
}

export const webhook: ITrigger<IWebhookMetadata> = {
  id: 'webhook',
  name: 'Webhook',
  description: 'Triggered when a webhook is received',

  dataAvailable: [{ key: 'input', label: 'Input', type: 'object' }],

  run: async () => {
    try {
      return {
        success: true,
        message: 'Webhook triggered',
        statusCode: 200,
      };
    } catch (error) {
      return {
        success: false,
        message: 'Error executing webhook trigger',
        statusCode: 500,
      };
    }
  },
};
