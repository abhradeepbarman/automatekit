import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import {
  connectionRelations,
  connections,
  executionLogRelations,
  executionLogs,
  passwordTokenRelations,
  passwordTokens,
  stepRelations,
  steps,
  userRelations,
  users,
  webhookRelations,
  webhooks,
  workflowRelations,
  workflows,
} from './schema';

const schema = {
  users,
  workflows,
  steps,
  connections,
  executionLogs,
  passwordTokens,
  webhooks,

  userRelations,
  workflowRelations,
  stepRelations,
  connectionRelations,
  executionLogRelations,
  passwordTokenRelations,
  webhookRelations,
};

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is not set');
}

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: Number(process.env.DATABASE_POOL_MAX) || 10,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 10_000,
});

pool.on('error', (error) => {
  console.error('Unexpected Postgres pool error:', error);
});

const db = drizzle(pool, { schema });

export default db;
