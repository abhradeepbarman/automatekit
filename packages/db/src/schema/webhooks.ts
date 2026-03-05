import { timestamp } from 'drizzle-orm/pg-core';
import { pgTable, uuid } from 'drizzle-orm/pg-core';
import { workflows } from './workflows';
import { varchar } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

export const webhooks = pgTable('webhooks', {
  id: uuid('id').primaryKey().defaultRandom().notNull(),
  workflowId: uuid('workflow_id')
    .notNull()
    .references(() => workflows.id, {
      onDelete: 'cascade',
      onUpdate: 'no action',
    }),
  path: varchar('path').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const webhookRelations = relations(webhooks, ({ one }) => ({
  workflow: one(workflows, {
    fields: [webhooks.workflowId],
    references: [workflows.id],
  }),
}));
