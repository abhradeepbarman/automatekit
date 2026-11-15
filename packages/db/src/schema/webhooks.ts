import { HttpMethod } from '@repo/common/types';
import { relations } from 'drizzle-orm';
import {
  integer,
  pgTable,
  timestamp,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';
import { httpMethodEnum } from './enums';
import { steps } from './steps';
import { workflows } from './workflows';

export const webhooks = pgTable('webhooks', {
  id: uuid('id').primaryKey().defaultRandom(),
  workflowId: uuid('workflow_id')
    .notNull()
    .references(() => workflows.id, { onDelete: 'cascade' }),
  stepId: uuid('step_id')
    .notNull()
    .unique()
    .references(() => steps.id, { onDelete: 'cascade' }),
  path: varchar('path').notNull().unique(),
  method: httpMethodEnum('method').default(HttpMethod.POST).notNull(),
  lastTriggeredAt: timestamp('last_triggered_at', { withTimezone: true }),
  triggerCount: integer('trigger_count').default(0).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
});

export const webhookRelations = relations(webhooks, ({ one }) => ({
  workflow: one(workflows, {
    fields: [webhooks.workflowId],
    references: [workflows.id],
  }),
  step: one(steps, {
    fields: [webhooks.stepId],
    references: [steps.id],
  }),
}));
