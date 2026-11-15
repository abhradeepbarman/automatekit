import { Resend } from 'resend';
import { envConfig } from './env';
import CustomErrorHandler from '../utils/custom-error-handler';

let resend: Resend | null = null;

const getResendClient = (): Resend => {
  if (resend) return resend;

  if (!envConfig.RESEND_API_KEY) {
    throw CustomErrorHandler.serverError(
      'Mail service is not configured: RESEND_API_KEY is missing',
    );
  }
  if (!envConfig.MAIL_FROM) {
    throw CustomErrorHandler.serverError(
      'Mail service is not configured: MAIL_FROM is missing',
    );
  }

  try {
    resend = new Resend(envConfig.RESEND_API_KEY);
  } catch (err) {
    console.error('[mail] Failed to initialize Resend client:', err);
    throw CustomErrorHandler.serverError('Failed to initialize mail service');
  }

  return resend;
};

type EmailContent =
  | { html: string; text?: string }
  | { html?: string; text: string };

export type SendEmailOptions = {
  to: string | string[];
  subject: string;
} & EmailContent;

export const sendEmail = async ({
  to,
  subject,
  html,
  text,
}: SendEmailOptions) => {
  const client = getResendClient();

  let result: Awaited<ReturnType<typeof client.emails.send>>;
  try {
    result = await client.emails.send({
      from: envConfig.MAIL_FROM,
      to,
      subject,
      ...(html ? { html } : {}),
      ...(text ? { text } : {}),
    } as Parameters<typeof client.emails.send>[0]);
  } catch (err) {
    console.error('[mail] Resend request failed:', err);
    throw CustomErrorHandler.serverError('Failed to send email');
  }

  if (result.error) {
    console.error('[mail] Resend returned an error:', result.error);
    throw CustomErrorHandler.serverError('Failed to send email');
  }

  return result.data;
};
