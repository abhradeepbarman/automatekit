import { Resend } from 'resend';
import { envConfig } from '../config/env';
import CustomErrorHandler from '../utils/custom-error-handler';

const resend = new Resend(envConfig.RESEND_API_KEY);

export const sendEmail = async ({
  to,
  subject,
  body,
}: {
  to: string;
  subject: string;
  body: string;
}) => {
  const { error } = await resend.emails.send({
    from: envConfig.MAIL_FROM,
    to,
    subject,
    html: body,
  });

  if (error) {
    throw CustomErrorHandler.serverError('Failed to send email');
  }
};
