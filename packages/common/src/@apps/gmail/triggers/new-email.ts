import axios, { AxiosError, get } from 'axios';
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

export interface NewEmailDataAvailable {
  id: { id: string; display: string };
  threadId: { id: string; display: string };
  subject: { id: string; display: string };
  body: { id: string; display: string };
  from: { id: string; display: string };
  to: { id: string; display: string };
  date: { id: string; display: string };
  snippet: { id: string; display: string };
}

export interface NewEmailOutput {
  id: string;
  threadId: string;
  subject: string;
  body: string;
  from: string;
  to: string;
  date: string;
  snippet: string;
}

export const newEmail: ITrigger<
  NewEmailMetadata,
  NewEmailDataAvailable,
  NewEmailOutput
> = {
  id: 'new-email',
  name: 'New email',
  description: 'Triggered when a new email is received',

  dataAvailable: {
    id: { id: 'id', display: 'Message ID' },
    threadId: { id: 'threadId', display: 'Thread ID' },
    subject: { id: 'subject', display: 'Subject' },
    body: { id: 'body', display: 'Body' },
    from: { id: 'from', display: 'From' },
    to: { id: 'to', display: 'To' },
    date: { id: 'date', display: 'Date' },
    snippet: { id: 'snippet', display: 'Snippet' },
  },

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
        messages.slice(0, 10).map(async (msg: any) => {
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
          } catch (e: any) {
            console.error(`Failed to fetch message ERROR: ${e.message}`);
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

      const message = validMessages[0];
      const dataToPass: NewEmailOutput = {
        id: message.id,
        threadId: message.threadId,
        subject: getHeader(message, 'subject'),
        from: getHeader(message, 'from'),
        to: getHeader(message, 'to'),
        date: getHeader(message, 'date'),
        snippet: message.snippet || '',
        body: getBody(message),
      };
      return {
        success: true,
        message: 'New emails found',
        data: dataToPass,
        statusCode: 200,
      };
    } catch (error) {
      console.error('Error executing new email trigger', error);
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

const getHeader = (msg: any, name: string): string => {
  const headers = msg.payload?.headers || [];
  const header = headers.find(
    (h: any) => h.name.toLowerCase() === name.toLowerCase(),
  );
  return header?.value || '';
};

const getBody = (msg: any): string => {
  const payload = msg.payload;

  if (!payload) return '';

  if (payload.body?.data) {
    return Buffer.from(payload.body.data, 'base64').toString('utf-8');
  }

  if (payload.parts) {
    const part = payload.parts.find((p: any) => p.mimeType === 'text/plain');

    if (part?.body?.data) {
      return Buffer.from(part.body.data, 'base64').toString('utf-8');
    }
  }

  return '';
};
