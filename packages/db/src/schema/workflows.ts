import { relations } from 'drizzle-orm';
import {
  boolean,
  index,
  pgTable,
  timestamp,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';
import { executions } from './executions';
import { steps } from './steps';
import { users } from './users';
import { webhooks } from './webhooks';

export const workflows = pgTable(
  'workflows',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    name: varchar('name').default('Untitled workflow').notNull(),
    isActive: boolean('is_active').default(false).notNull(),
    activatedAt: timestamp('activated_at', { withTimezone: true }),
    lastExecutedAt: timestamp('last_executed_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (t) => [index('workflows_user_id_idx').on(t.userId)],
);

export const workflowRelations = relations(workflows, ({ one, many }) => ({
  user: one(users, {
    fields: [workflows.userId],
    references: [users.id],
  }),
  steps: many(steps),
  executions: many(executions),
  webhooks: many(webhooks),
}));
