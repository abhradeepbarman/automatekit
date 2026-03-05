import { drizzle } from 'drizzle-orm/node-postgres';
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

const db = drizzle(process.env.DATABASE_URL!, { schema });

export default db;
