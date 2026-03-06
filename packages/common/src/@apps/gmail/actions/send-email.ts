import axios, { AxiosError } from 'axios';
import { type ReturnResponse, type IAction } from '../../../types';
import { z } from 'zod';

export interface SendEmailMetadata {
  to: string;
  subject: string;
  body: string;
}

export const sendEmail: IAction<SendEmailMetadata> = {
  id: 'send-email',
  name: 'Send Email',
  description: 'Send an email via Gmail',

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

  run: async ({ metadata, accessToken }): Promise<ReturnResponse> => {
    try {
      const { to, subject, body } = metadata;

      // Create the email in RFC 2822 format
      const email = [
        `To: ${to}`,
        `Subject: ${subject}`,
        'Content-Type: text/plain; charset=utf-8',
        '',
        body,
      ].join('\r\n');

      // Encode the email in base64url format
      const encodedEmail = Buffer.from(email)
        .toString('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');

      const response = await axios.post(
        'https://gmail.googleapis.com/gmail/v1/users/me/messages/send',
        {
          raw: encodedEmail,
        },
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
        },
      );

      return {
        success: true,
        message: 'Email sent successfully',
        statusCode: 200,
        data: response.data,
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
