import { relations } from 'drizzle-orm';
import { pgTable, timestamp, uuid, varchar } from 'drizzle-orm/pg-core';
import { steps } from './steps';
import { users } from './users';

export const connections = pgTable('connections', {
  id: uuid('id').primaryKey().defaultRandom().notNull(),
  name: varchar('name').notNull(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, {
      onDelete: 'cascade',
      onUpdate: 'no action',
    }),
  app: varchar('app').notNull(),

  accessTokenEncrypt: varchar('access_token_encrypt').notNull(),
  accessTokenIV: varchar('access_token_iv').notNull(),
  accessTokenTag: varchar('access_token_tag').notNull(),

  refreshTokenEncrypt: varchar('refresh_token_encrypt'),
  refreshTokenIV: varchar('refresh_token_iv'),
  refreshTokenTag: varchar('refresh_token_tag'),

  expiresAt: timestamp('expires_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const connectionRelations = relations(connections, ({ one, many }) => ({
  user: one(users, {
    fields: [connections.userId],
    references: [users.id],
  }),
  steps: many(steps),
}));
