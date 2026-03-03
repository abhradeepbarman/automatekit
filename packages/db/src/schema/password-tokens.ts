import { relations } from 'drizzle-orm';
import { pgTable, timestamp, uuid, varchar } from 'drizzle-orm/pg-core';
import { users } from './users';

export const passwordTokens = pgTable('password_tokens', {
  id: uuid('id').primaryKey().defaultRandom().notNull(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, {
      onDelete: 'cascade',
      onUpdate: 'no action',
    }),
  token: varchar('token').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const passwordTokenRelations = relations(passwordTokens, ({ one }) => ({
  user: one(users, {
    fields: [passwordTokens.userId],
    references: [users.id],
  }),
}));
