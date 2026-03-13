import axios, { AxiosError } from 'axios';
import { type ReturnResponse, type IAction } from '../../../types';
import { z } from 'zod';

export interface SendEmailMetadata {
  to: string;
  subject: string;
  body: string;
}

export interface SendEmailDataAvailable {
  to: {
    id: string;
    display: string;
  };
  subject: {
    id: string;
    display: string;
  };
  body: {
    id: string;
    display: string;
  };
  senderEmail: {
    id: string;
    display: string;
  };
}

export interface SendEmailOutput {
  messageId: string;
  threadId: string;
  to: string;
  subject: string;
  body: string;
}

export const sendEmail: IAction<
  SendEmailMetadata,
  SendEmailDataAvailable,
  SendEmailOutput
> = {
  id: 'send-email',
  name: 'Send Email',
  description: 'Send an email via Gmail',

  dataAvailable: {
    to: {
      id: 'to',
      display: 'Recipient Email',
    },
    subject: {
      id: 'subject',
      display: 'Subject',
    },
    body: {
      id: 'body',
      display: 'Body',
    },
    senderEmail: {
      id: 'senderEmail',
      display: 'Sender Email',
    },
  },

  fields: [
    {
      name: 'to',
      label: 'To',
      type: 'email',
      placeholder: 'recipient@example.com',
      validations: () => z.string().email('Invalid email address'),
    },
    {
      name: 'subject',
      label: 'Subject',
      type: 'text',
      placeholder: 'Email subject',
      validations: () => z.string().min(1, 'Subject is required'),
    },
    {
      name: 'body',
      label: 'Body',
      type: 'textarea',
      placeholder: 'Email body',
      validations: () => z.string().min(1, 'Body is required'),
    },
  ],

  run: async ({ metadata, accessToken, input }): Promise<ReturnResponse> => {
    try {
      // TODO: replace input elements
      console.log('input', input);
      const to = metadata.to;
      const subject = metadata.subject;
      const body = metadata.body;

      const email = [
        `To: ${to}`,
        `Subject: ${subject}`,
        'Content-Type: text/plain; charset=utf-8',
        '',
        body,
      ].join('\r\n');

      const encodedEmail = Buffer.from(email)
        .toString('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');

      const response = await axios.post(
        'https://gmail.googleapis.com/gmail/v1/users/me/messages/send',
        { raw: encodedEmail },
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
        },
      );

      const output: SendEmailOutput = {
        messageId: response.data.id,
        threadId: response.data.threadId,
        to,
        subject,
        body,
      };

      return {
        success: true,
        message: 'Email sent successfully',
        statusCode: 200,
        data: output,
      };
    } catch (error) {
      if (error instanceof AxiosError) {
        return {
          success: false,
          message:
            error.response?.data?.error?.message || 'Error sending email',
          statusCode: error.response?.status || 500,
          error: error.message,
        };
      }

      return {
        success: false,
        message: 'Error sending email',
        statusCode: 500,
        error: error as any,
      };
    }
  },
};
