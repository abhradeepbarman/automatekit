import type { ConnectionOptions } from 'bullmq';

export const redisConnection = (): ConnectionOptions => {
  const url = process.env.REDIS_URL;
  if (!url) {
    throw new Error('REDIS_URL is not set');
  }

  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new Error('REDIS_URL is not a valid URL');
  }

  if (parsed.protocol !== 'redis:' && parsed.protocol !== 'rediss:') {
    throw new Error('REDIS_URL must start with redis:// or rediss://');
  }

  return {
    host: parsed.hostname,
    port: Number(parsed.port) || 6379,
    username: decodeURIComponent(parsed.username) || undefined,
    password: decodeURIComponent(parsed.password) || undefined,
    tls: parsed.protocol === 'rediss:' ? {} : undefined,
    // Required by BullMQ workers.
    maxRetriesPerRequest: null,
  };
};
