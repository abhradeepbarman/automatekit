import { relations } from 'drizzle-orm';
import { pgTable, timestamp, uuid, varchar } from 'drizzle-orm/pg-core';
import { connections } from './connections';
import { passwordTokens } from './password-tokens';
import { webhooks } from './webhooks';
import { workflows } from './workflows';

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom().notNull(),
  name: varchar('name').notNull(),
  email: varchar('email').notNull().unique(),
  password: varchar('password').notNull(),
  refreshToken: varchar('refresh_token'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const userRelations = relations(users, ({ many }) => ({
  workflows: many(workflows),
  connections: many(connections),
  passwordTokens: many(passwordTokens),
  webhooks: many(webhooks),
}));
