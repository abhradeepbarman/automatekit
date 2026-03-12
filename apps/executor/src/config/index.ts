import 'dotenv/config';

const _config = {
  DATABASE_URL: process.env.DATABASE_URL || '',
  ENCRYPTION_KEY: process.env.ENCRYPTION_KEY || '',

  REDIS_URL: process.env.REDIS_URL || '',
};

const config = Object.freeze(_config);
export default config;
