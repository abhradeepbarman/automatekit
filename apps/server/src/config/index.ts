import 'dotenv/config';

const _config = {
  PORT: process.env.PORT || 5000,
  DATABASE_URL: process.env.DATABASE_URL || '',
  ACCESS_SECRET: process.env.ACCESS_SECRET || '',
  REFRESH_SECRET: process.env.REFRESH_SECRET || '',
  NODE_ENV: process.env.NODE_ENV || 'development',
  APP_URL: process.env.APP_URL || '',

  MAIL_USER: process.env.MAIL_USER || '',
  MAIL_PASS: process.env.MAIL_PASS || '',

  GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID || '',
  GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET || '',
  GOOGLE_REDIRECT_URI: process.env.GOOGLE_REDIRECT_URI || '',
};

const config = Object.freeze(_config);
export default config;
