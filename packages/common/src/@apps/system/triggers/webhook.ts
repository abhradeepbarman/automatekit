import { type ITrigger, type ReturnResponse } from '../../../types';

export interface IWebhookMetadata {
  workflowId: string;
  path: string;
  input: unknown;
}
export interface WebhookOutput {
  input: {
    id: string;
    data: unknown;
  };
}

export const webhook: ITrigger<IWebhookMetadata, WebhookOutput> = {
  id: 'webhook',
  name: 'Webhook',
  description: 'Triggered when a webhook is received',

  dataAvailable: {
    input: {
      id: 'input',
      display: 'Input',
    },
  },

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
