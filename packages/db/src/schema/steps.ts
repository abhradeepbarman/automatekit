import { StepType } from '@repo/common/types';
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
import { workflows } from './workflows';
import { executionLogs } from './executions-logs';
import { webhooks } from './webhooks';

export const steps = pgTable(
  'steps',
  {
    id: uuid('id').primaryKey().defaultRandom().notNull(),
    workflowId: uuid('workflow_id')
      .references(() => workflows.id, {
        onDelete: 'cascade',
        onUpdate: 'no action',
      })
      .notNull(),
    type: varchar('type', {
      enum: [StepType.TRIGGER, StepType.ACTION],
    }).notNull(),
    eventName: varchar('event_name').notNull(),
    index: integer('index').notNull(),
    app: varchar('app').notNull(),
    metadata: jsonb('metadata'),
    connectionId: uuid('connection_id').references(() => connections.id, {
      onDelete: 'set null',
      onUpdate: 'no action',
    }),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at')
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (t) => [
    uniqueIndex('steps_workflow_id_index_unq').on(t.workflowId, t.index),
  ],
);

export const stepRelations = relations(steps, ({ one, many }) => ({
  workflows: one(workflows, {
    fields: [steps.workflowId],
    references: [workflows.id],
  }),
  connections: one(connections, {
    fields: [steps.connectionId],
    references: [connections.id],
  }),
  executionLogs: many(executionLogs),
  webhooks: one(webhooks, {
    fields: [steps.id],
    references: [webhooks.stepId],
  }),
}));
