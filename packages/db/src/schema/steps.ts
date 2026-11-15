import { relations } from 'drizzle-orm';
import {
  integer,
  jsonb,
  pgTable,
  timestamp,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';
import { connections } from './connections';
import { stepTypeEnum } from './enums';
import { executionSteps } from './execution-steps';
import { stepEdges } from './step-edges';
import { webhooks } from './webhooks';
import { workflows } from './workflows';

export const steps = pgTable('steps', {
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
  config: jsonb('config')
    .$type<Record<string, unknown>>()
    .default({})
    .notNull(),
  position: jsonb('position').$type<{ x: number; y: number }>().notNull(),
  createdAt: timestamp('created_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
});

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
  outgoingEdges: many(stepEdges, { relationName: 'source' }),
  incomingEdges: many(stepEdges, { relationName: 'target' }),
  executionSteps: many(executionSteps),
}));
