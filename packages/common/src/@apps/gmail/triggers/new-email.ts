import axios from 'axios';
import { z } from 'zod';
import {
  ConditionOperator,
  PollingInterval,
  type SchemaToData,
  type ITrigger,
} from '../../../types';

export interface NewEmailMetadata {
  intervalMs: PollingInterval;
  field: 'subject' | 'body';
  operator: ConditionOperator;
  value: string;
}

export const newEmailDataAvailable = [
  { key: 'messageId', label: 'Message ID', type: 'string' },
  { key: 'threadId', label: 'Thread ID', type: 'string' },
  { key: 'subject', label: 'Subject', type: 'string' },
  { key: 'body', label: 'Body', type: 'string' },
  { key: 'senderEmail', label: 'Sender Email', type: 'string' },
  { key: 'receiverEmail', label: 'Receiver Email', type: 'string' },
  { key: 'date', label: 'Date', type: 'date' },
] as const;
export type NewEmailDataAvailable = typeof newEmailDataAvailable;

export const newEmail: ITrigger<NewEmailMetadata, NewEmailDataAvailable> = {
  id: 'new-email',
  name: 'New email',
  description: 'Triggered when a new email is received',

  dataAvailable: newEmailDataAvailable,

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
      const lastExecuted = new Date(lastExecutedAt);
      const seconds = Math.floor(lastExecuted.getTime() / 1000);

      const params = new URLSearchParams({
        maxResults: '10',
        q: `is:unread after:${seconds}`,
        labelIds: 'INBOX',
      });

      const response = await axios.get(
        `https://www.googleapis.com/gmail/v1/users/me/messages`,
        {
          params,
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        },
      );

      const messages = response.data?.messages;
      if (!messages || messages.length === 0) {
        return {
          success: false,
          message: 'No new emails found',
          statusCode: 204,
        };
      }

      const detailedMessages = await Promise.all(
        messages.map(async (msg: any) => {
          const msgDetails = await axios.get(
            `https://www.googleapis.com/gmail/v1/users/me/messages/${msg.id}`,
            {
              headers: {
                Authorization: `Bearer ${accessToken}`,
              },
            },
          );
          return msgDetails.data;
        }),
      );

      const validMessages: Message[] = detailedMessages.filter(
        (msg: Message) => {
          if (!msg) return false;

          let contentToCheck = '';
          if (field === 'subject') {
            contentToCheck = getHeader(msg.payload?.headers || [], 'Subject');
          } else if (field === 'body') {
            contentToCheck = getBody(msg.payload);
          }

          if (!contentToCheck) return false;

          if (operator === ConditionOperator.CONTAINS) {
            return contentToCheck.toLowerCase().includes(value.toLowerCase());
          } else if (operator === ConditionOperator.EQUAL) {
            return contentToCheck === value;
          }

          return false;
        },
      );

      if (validMessages.length === 0) {
        return {
          success: false,
          message: 'No matching emails found',
          statusCode: 204,
        };
      }

      //TODO: for now, just allowing 1 valid message & move on
      const validMsg = validMessages[0]!;
      const dataToPass: SchemaToData<NewEmailDataAvailable> = {
        messageId: validMsg.id!,
        threadId: validMsg.threadId!,
        subject: getHeader(validMsg.payload?.headers || [], 'Subject'),
        body: getBody(validMsg.payload),
        senderEmail: getHeader(validMsg.payload?.headers || [], 'From'),
        receiverEmail: extractEmails(
          getHeader(validMsg.payload?.headers || [], 'To'),
        ).join(', '),
        date: getHeader(validMsg.payload?.headers || [], 'Date'),
      };

      return {
        success: true,
        message: 'Email found',
        statusCode: 200,
        data: dataToPass,
      };
    } catch (error: Error | any) {
      console.error('Error executing new-email trigger:', error);
      return {
        success: false,
        message: 'Error executing new-email trigger',
        statusCode: 500,
        error: error,
      };
    }
  },
};

const getHeader = (headers: any[], name: string) =>
  headers?.find((h) => h.name.toLowerCase() === name.toLowerCase())?.value ||
  '';

const extractEmails = (headerValue: string) => {
  const matches = headerValue.match(/[\w.-]+@[\w.-]+\.\w+/g);
  return matches || [];
};

const decodeBase64 = (data: string) => {
  return Buffer.from(data, 'base64').toString('utf-8');
};

const getBody = (payload: any): string => {
  if (!payload) return '';

  // Direct body
  if (payload.body?.data) {
    return decodeBase64(payload.body.data);
  }

  // Recursive search in parts
  if (payload.parts) {
    for (const part of payload.parts) {
      // Prefer plain text
      if (part.mimeType === 'text/plain' && part.body?.data) {
        return decodeBase64(part.body.data);
      }
    }

    // fallback to html
    for (const part of payload.parts) {
      if (part.mimeType === 'text/html' && part.body?.data) {
        return decodeBase64(part.body.data);
      }
    }

    // recursive deep search
    for (const part of payload.parts) {
      const result = getBody(part);
      if (result) return result;
    }
  }

  return '';
};

/**
 * Represents an email message in the Gmail API.
 */
export interface Message {
  /** The immutable ID of the message. */
  id?: string;
  /** The ID of the thread the message belongs to. */
  threadId?: string;
  /** List of IDs of labels applied to this message. */
  labelIds?: string[];
  /** A short part of the message text. */
  snippet?: string;
  /** The ID of the last history record that modified this message. */
  historyId?: string;
  /** The internal message creation timestamp (epoch ms). */
  internalDate?: string;
  /** The parsed email structure in the message parts. */
  payload?: MessagePart;
  /** Estimated size in bytes of the message. */
  sizeEstimate?: number;
  /** The entire email message in an RFC 2822 formatted and base64url encoded string. */
  raw?: string;
  /** Classification Label values on the message (Google Workspace accounts only). */
  classificationLabelValues?: ClassificationLabelValue[];
}

export interface MessagePart {
  partId?: string;
  mimeType?: string;
  filename?: string;
  headers?: Header[];
  body?: MessagePartBody;
  parts?: MessagePart[];
}

export interface Header {
  name?: string;
  value?: string;
}

export interface MessagePartBody {
  attachmentId?: string;
  size?: number;
  data?: string;
}

export interface ClassificationLabelValue {
  labelId: string;
  fields?: ClassificationLabelFieldValue[];
}

export interface ClassificationLabelFieldValue {
  fieldId: string;
  selection?: string;
}
