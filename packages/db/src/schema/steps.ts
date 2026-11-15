import { relations } from 'drizzle-orm';
import {
  integer,
  jsonb,
  pgTable,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';
import { connections } from './connections';
import { stepTypeEnum } from './enums';
import { executionSteps } from './execution-steps';
import { webhooks } from './webhooks';
import { workflows } from './workflows';

export const steps = pgTable(
  'steps',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    workflowId: uuid('workflow_id')
      .notNull()
      .references(() => workflows.id, { onDelete: 'cascade' }),
    connectionId: uuid('connection_id').references(() => connections.id, {
      onDelete: 'set null',
    }),
    type: stepTypeEnum('type').notNull(),
    index: integer('index').notNull(),
    integration: varchar('integration').notNull(),
    eventName: varchar('event_name').notNull(),
    metadata: jsonb('metadata'),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (t) => [uniqueIndex('steps_workflow_id_index_unq').on(t.workflowId, t.index)],
);

export const stepRelations = relations(steps, ({ one, many }) => ({
  workflow: one(workflows, {
    fields: [steps.workflowId],
    references: [workflows.id],
  }),
  connection: one(connections, {
    fields: [steps.connectionId],
    references: [connections.id],
  }),
  webhook: one(webhooks),
  executionSteps: many(executionSteps),
}));
