import axios, { AxiosError } from 'axios';
import {
  ConditionOperator,
  PollingInterval,
  type ReturnResponse,
  type ITrigger,
} from '../../../types';
import { z } from 'zod';

export interface NewEmailMetadata {
  intervalMs: PollingInterval;
  field: 'subject' | 'body';
  operator: ConditionOperator;
  value: string;
}

export const newEmail: ITrigger<NewEmailMetadata> = {
  id: 'new-email',
  name: 'New email',
  description: 'Triggered when a new email is received',

  fields: [
    {
      name: 'field',
      label: 'Select a field',
      type: 'select',
      options: [
        { value: 'subject', label: 'Subject' },
        { value: 'body', label: 'Body' },
      ],
      validations: () => z.string().min(1, 'Field is required'),
    },
    {
      name: 'operator',
      label: 'Select an operator',
      type: 'select',
      options: [
        { value: ConditionOperator.CONTAINS, label: 'Contains' },
        { value: ConditionOperator.EQUAL, label: 'Equal' },
      ],
      validations: () => z.string().min(1, 'Operator is required'),
    },
    {
      name: 'value',
      label: 'Value',
      type: 'text',
      validations: () => z.string().min(1, 'Value is required'),
    },
  ],

  run: async ({
    metadata,
    lastExecutedAt,
    accessToken,
  }): Promise<ReturnResponse> => {
    try {
      const { field, operator, value } = metadata;
      const lastExecuted = lastExecutedAt ? new Date(lastExecutedAt) : null;
      const params = new URLSearchParams();

      params.set('q', 'is:unread');
      if (lastExecuted) {
        const seconds = Math.floor(lastExecuted.getTime() / 1000);
        params.set('after', seconds.toString());
      }

      const response = await axios.get(
        `https://www.googleapis.com/gmail/v1/users/me/messages`,
        {
          params,
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        },
      );

      const messages = response.data.messages;
      if (!messages || messages.length === 0) {
        return {
          success: false,
          message: 'No new emails found',
          statusCode: 204,
        };
      }

      const detailedMessages = await Promise.all(
        messages.map(async (msg: any) => {
          try {
            const msgDetails = await axios.get(
              `https://www.googleapis.com/gmail/v1/users/me/messages/${msg.id}`,
              {
                headers: {
                  Authorization: `Bearer ${accessToken}`,
                },
              },
            );
            return msgDetails.data;
          } catch (e) {
            console.error(`Failed to fetch message ${msg.id}`, e);
            return null;
          }
        }),
      );

      const validMessages = detailedMessages.filter((msg) => {
        if (!msg) return false;

        let contentToCheck = '';
        if (field === 'subject') {
          const headers = msg.payload.headers;
          const subjectHeader = headers.find(
            (h: any) => h.name.toLowerCase() === 'subject',
          );
          contentToCheck = subjectHeader ? subjectHeader.value : '';
        } else if (field === 'body') {
          contentToCheck = msg.snippet;
        }

        if (operator === ConditionOperator.CONTAINS) {
          return contentToCheck.toLowerCase().includes(value.toLowerCase());
        } else if (operator === ConditionOperator.EQUAL) {
          return contentToCheck === value;
        }

        return false;
      });

      if (validMessages.length === 0) {
        return {
          success: false,
          message: 'No matching emails found',
          statusCode: 204,
        };
      }

      return {
        success: true,
        message: 'New emails found',
        data: validMessages,
        statusCode: 200,
      };
    } catch (error) {
      if (error instanceof AxiosError) {
        return {
          success: false,
          message:
            error.response?.data?.error?.message ||
            'Error executing new email trigger',
          statusCode: error.response?.status || 500,
          error: error.message,
        };
      }

      return {
        success: false,
        message: 'Error executing new email trigger',
        statusCode: 500,
        error: error as any,
      };
    }
  },
};
