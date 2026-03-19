import { relations } from 'drizzle-orm';
import {
  boolean,
  pgTable,
  timestamp,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';
import { steps } from './steps';
import { users } from './users';
import { executionLogs } from './executions-logs';

export const workflows = pgTable('workflows', {
  id: uuid('id').primaryKey().defaultRandom().notNull(),
  name: varchar('name').default('Untitled workflow').notNull(),
  userId: uuid('user_id')
    .references(() => users.id, {
      onDelete: 'cascade',
      onUpdate: 'no action',
    })
    .notNull(),
  isActive: boolean('is_active').notNull().default(false),
  activatedAt: timestamp('activated_at'),
  lastExecutedAt: timestamp('last_executed_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const workflowRelations = relations(workflows, ({ one, many }) => ({
  user: one(users, {
    fields: [workflows.userId],
    references: [users.id],
  }),
  steps: many(steps),
  executionLogs: many(executionLogs),
}));
