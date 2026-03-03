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

  userRelations,
  workflowRelations,
  stepRelations,
  connectionRelations,
  executionLogRelations,
  passwordTokenRelations,
};

const db = drizzle(process.env.DATABASE_URL!, { schema });

export default db;
