import axios, { AxiosError } from 'axios';
import { z } from 'zod';
import {
  ConditionOperator,
  PollingInterval,
  type ITrigger,
} from '../../../types';

export interface NewEmailMetadata {
  intervalMs: PollingInterval;
  field: 'subject' | 'body';
  operator: ConditionOperator;
  value: string;
}

export interface NewEmailOutput {
  messageId: {
    id: string;
    data: string;
  };
  threadId: {
    id: string;
    data: string;
  };
  subject: {
    id: string;
    data: string;
  };
  body: {
    id: string;
    data: string;
  };
  from: {
    id: string;
    data: string;
  };
  to: {
    id: string;
    data: string;
  };
  date: {
    id: string;
    data: string;
  };
  snippet: {
    id: string;
    data: string;
  };
}

export const newEmail: ITrigger<NewEmailMetadata, NewEmailOutput> = {
  id: 'new-email',
  name: 'New email',
  description: 'Triggered when a new email is received',

  dataAvailable: {
    messageId: { id: 'message-id', display: 'Message ID' },
    threadId: { id: 'thread-id', display: 'Thread ID' },
    subject: { id: 'subject', display: 'Subject' },
    body: { id: 'body', display: 'Body' },
    senderEmail: { id: 'sender-email', display: 'Sender email' },
    receiverEmail: { id: 'receiver-email', display: 'Receiver email' },
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

  run: async ({ metadata, lastExecutedAt, accessToken }) => {
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
        messageId: {
          id: 'message-id',
          data: message.id,
        },
        threadId: {
          id: 'thread-id',
          data: message.threadId,
        },
        subject: {
          id: 'subject',
          data: getHeader(message, 'subject'),
        },
        from: {
          id: 'from',
          data: getHeader(message, 'from'),
        },
        to: {
          id: 'to',
          data: getHeader(message, 'to'),
        },
        date: {
          id: 'date',
          data: getHeader(message, 'date'),
        },
        snippet: {
          id: 'snippet',
          data: message.snippet,
        },
        body: {
          id: 'body',
          data: getBody(message),
        },
      };

      return {
        success: true,
        message: 'New emails found',
        statusCode: 200,
        data: dataToPass,
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
