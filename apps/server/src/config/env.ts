import 'dotenv/config';

export const envConfig = Object.freeze({
  PORT: Number(process.env.PORT) || 5000,
  NODE_ENV: process.env.NODE_ENV || 'development',

  DATABASE_URL: process.env.DATABASE_URL || '',

  ACCESS_SECRET: process.env.ACCESS_SECRET || '',
  REFRESH_SECRET: process.env.REFRESH_SECRET || '',

  APP_URL: process.env.APP_URL || '',
  API_URL: process.env.API_URL || '',

  GOOGLE_AUTH_CLIENT_ID: process.env.GOOGLE_AUTH_CLIENT_ID || '',
  GOOGLE_AUTH_CLIENT_SECRET: process.env.GOOGLE_AUTH_CLIENT_SECRET || '',
  GOOGLE_AUTH_REDIRECT_URI:
    process.env.GOOGLE_AUTH_REDIRECT_URI ||
    `${process.env.API_URL}/api/v1/auth/google/callback`,

  RESEND_API_KEY: process.env.RESEND_API_KEY || '',
  MAIL_FROM: process.env.MAIL_FROM || '',
});
