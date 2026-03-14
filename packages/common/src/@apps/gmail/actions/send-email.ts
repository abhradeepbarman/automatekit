import axios, { AxiosError } from 'axios';
import { type ReturnResponse, type IAction } from '../../../types';
import { z } from 'zod';

export interface SendEmailMetadata {
  to: string;
  subject: string;
  body: string;
}

export interface SendEmailOutput {
  receiverEmail: { id: string; data: string };
  subject: { id: string; data: string };
  body: { id: string; data: string };
  senderEmail: { id: string; data: string };
}

export const sendEmail: IAction<SendEmailMetadata, SendEmailOutput> = {
  id: 'send-email',
  name: 'Send Email',
  description: 'Send an email via Gmail',

  dataAvailable: {
    receiverEmail: {
      id: 'receiver-email',
      display: 'Receiver Email',
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
      id: 'sender-email',
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

  run: async ({ metadata, accessToken }) => {
    try {
      // TODO: replace input elements
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
        receiverEmail: { id: 'receiver-email', data: to },
        subject: { id: 'subject', data: subject },
        body: { id: 'body', data: body },
        senderEmail: { id: 'sender-email', data: response.data.sender },
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
