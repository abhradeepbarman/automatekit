import { type ITrigger, type ReturnResponse } from '../../../types';

export interface IWebhookMetadata {
  workflowId: string;
  path: string;
  input: unknown;
}

export interface WebhookDataAvailable {
  input: {
    id: string;
    display: string;
  };
}

export interface WebhookOutput {
  input: unknown;
}

export const webhook: ITrigger<
  IWebhookMetadata,
  WebhookDataAvailable,
  WebhookOutput
> = {
  id: 'webhook',
  name: 'Webhook',
  description: 'Triggered when a webhook is received',

  dataAvailable: {
    input: {
      id: 'INPUT',
      display: 'Input',
    },
  },

  run: async (): Promise<ReturnResponse> => {
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
