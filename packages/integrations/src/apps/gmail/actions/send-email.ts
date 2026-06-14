import { z } from 'zod';
import { type IAction } from '@repo/common/types';

// Shared by the frontend form and backend step validation. `axios` is imported
// lazily in `run` so this module stays client-safe and tree-shakes cleanly.
export const sendEmailSchema = z.object({
  to: z.string().email('Invalid email address'),
  subject: z.string().min(1, 'Subject is required'),
  body: z.string().min(1, 'Body is required'),
});

export interface SendEmailMetadata {
  to: string;
  subject: string;
  body: string;
}

const sendEmailDataAvailable = [
  { key: 'receiverEmail', label: 'Receiver Email', type: 'string' },
  { key: 'subject', label: 'Subject', type: 'string' },
  { key: 'body', label: 'Body', type: 'string' },
] as const;
type SendEmailDataAvailable = typeof sendEmailDataAvailable;

export const sendEmail: IAction<SendEmailMetadata, SendEmailDataAvailable> = {
  id: 'send-email',
  name: 'Send Email',
  description: 'Send an email via Gmail',

  schema: sendEmailSchema,
  dataAvailable: sendEmailDataAvailable,

  run: async ({ metadata, accessToken }) => {
    try {
      const axios = (await import('axios')).default;
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

      await axios.post(
        'https://gmail.googleapis.com/gmail/v1/users/me/messages/send',
        { raw: encodedEmail },
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
        data: {
          subject: subject,
          body: body,
          receiverEmail: to,
        },
      };
    } catch (error: Error | any) {
      return {
        success: false,
        message: 'Error sending email',
        statusCode: 500,
        error,
      };
    }
  },
};
