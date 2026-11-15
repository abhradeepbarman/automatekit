import axios from 'axios';
import { z } from 'zod';
import { type IAction } from '@repo/common/types';

export const sendEmailSchema = z.object({
  to: z.string().email('Invalid email address'),
  subject: z.string().min(1, 'Subject is required'),
  body: z.string().min(1, 'Body is required'),
});

export type SendEmailMetadata = z.infer<typeof sendEmailSchema>;

const stripHeaderBreaks = (value: string) => value.replace(/[\r\n]+/g, ' ');

const encodeHeaderValue = (value: string) => {
  const clean = stripHeaderBreaks(value);
  if (/^[\x20-\x7E]*$/.test(clean)) return clean;
  return `=?UTF-8?B?${Buffer.from(clean, 'utf8').toString('base64')}?=`;
};

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
      const to = stripHeaderBreaks(metadata.to);
      const subject = metadata.subject;
      const body = metadata.body;

      const email = [
        `To: ${to}`,
        `Subject: ${encodeHeaderValue(subject)}`,
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
      const statusCode = error?.response?.status ?? 500;
      const providerMessage =
        error?.response?.data?.error?.message ?? error?.message;

      return {
        success: false,
        message: providerMessage
          ? `Error sending email: ${providerMessage}`
          : 'Error sending email',
        statusCode,
      };
    }
  },
};
