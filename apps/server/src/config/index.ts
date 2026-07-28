import 'dotenv/config';
import { z } from 'zod';

const envSchema = z
  .object({
    PORT: z.coerce.number().int().positive().default(5000),
    NODE_ENV: z
      .enum(['development', 'test', 'production'])
      .default('development'),

    DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
    REDIS_URL: z.string().min(1, 'REDIS_URL is required'),

    ACCESS_SECRET: z.string().min(32, 'ACCESS_SECRET must be >= 32 characters'),
    REFRESH_SECRET: z
      .string()
      .min(32, 'REFRESH_SECRET must be >= 32 characters'),
    ENCRYPTION_KEY: z
      .string()
      .regex(/^[0-9a-fA-F]{64}$/, 'ENCRYPTION_KEY must be 64 hex characters'),

    APP_URL: z.string().url('APP_URL must be a valid URL'),
    API_URL: z.string().url('API_URL must be a valid URL'),

    GOOGLE_AUTH_CLIENT_ID: z.string().default(''),
    GOOGLE_AUTH_CLIENT_SECRET: z.string().default(''),
    GOOGLE_AUTH_REDIRECT_URI: z.string().optional(),

    MAIL_USER: z.string().default(''),
    MAIL_PASS: z.string().default(''),

    GOOGLE_CLIENT_ID: z.string().default(''),
    GOOGLE_CLIENT_SECRET: z.string().default(''),
    GOOGLE_REDIRECT_URI: z.string().default(''),

    SHUTDOWN_TIMEOUT_MS: z.coerce.number().int().positive().default(15_000),
  })
  .transform((env) => ({
    ...env,
    GOOGLE_AUTH_REDIRECT_URI:
      env.GOOGLE_AUTH_REDIRECT_URI ||
      `${env.API_URL}/api/v1/auth/google/callback`,
  }))
  .refine((env) => env.ACCESS_SECRET !== env.REFRESH_SECRET, {
    message: 'ACCESS_SECRET and REFRESH_SECRET must be different',
    path: ['REFRESH_SECRET'],
  });

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  const issues = parsed.error.issues
    .map((issue) => `  - ${issue.path.join('.')}: ${issue.message}`)
    .join('\n');
  throw new Error(`Invalid server environment configuration:\n${issues}`);
}

const config = Object.freeze(parsed.data);
export default config;
