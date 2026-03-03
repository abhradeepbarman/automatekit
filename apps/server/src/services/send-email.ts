import nodemailer from 'nodemailer';
import config from '../config';

const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 587,
  secure: false,
  auth: {
    user: config.MAIL_USER,
    pass: config.MAIL_PASS,
  },
});

export const sendEmail = async ({
  to,
  subject,
  body,
}: {
  to: string;
  subject: string;
  body: string;
}) => {
  try {
    const info = await transporter.sendMail({
      from: config.MAIL_USER,
      to,
      subject,
      html: body,
    });

    if (info.messageId) console.log('Email sent:', info.messageId);
    else throw new Error('Email not sent');

    return info;
  } catch (error) {
    throw error;
  }
};
