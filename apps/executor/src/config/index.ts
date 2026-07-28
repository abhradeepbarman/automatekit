import 'dotenv/config';
import { z } from 'zod';

const envSchema = z.object({
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  REDIS_URL: z.string().min(1, 'REDIS_URL is required'),
  ENCRYPTION_KEY: z
    .string()
    .regex(/^[0-9a-fA-F]{64}$/, 'ENCRYPTION_KEY must be 64 hex characters'),
  NODE_ENV: z
    .enum(['development', 'test', 'production'])
    .default('development'),
  WORKER_CONCURRENCY: z.coerce.number().int().positive().default(5),
  SHUTDOWN_TIMEOUT_MS: z.coerce.number().int().positive().default(15_000),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  const issues = parsed.error.issues
    .map((issue) => `  - ${issue.path.join('.')}: ${issue.message}`)
    .join('\n');
  throw new Error(`Invalid executor environment configuration:\n${issues}`);
}

const config = Object.freeze(parsed.data);
export default config;
