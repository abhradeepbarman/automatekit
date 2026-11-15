import { AuthProvider } from '@repo/common/types';
import { relations } from 'drizzle-orm';
import { pgTable, timestamp, uuid, varchar } from 'drizzle-orm/pg-core';
import { connections } from './connections';
import { authProviderEnum } from './enums';
import { passwordResetTokens } from './password-reset-tokens';
import { workflows } from './workflows';

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name').notNull(),
  email: varchar('email').notNull().unique(),
  passwordHash: varchar('password_hash'),
  authProvider: authProviderEnum('auth_provider')
    .default(AuthProvider.LOCAL)
    .notNull(),
  refreshTokenHash: varchar('refresh_token_hash'),
  createdAt: timestamp('created_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
});

export const userRelations = relations(users, ({ many }) => ({
  workflows: many(workflows),
  connections: many(connections),
  passwordResetTokens: many(passwordResetTokens),
}));
