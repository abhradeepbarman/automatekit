import { ExecutionStatus } from '@repo/common/types';
import { relations } from 'drizzle-orm';
import {
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';
import { executionStatusEnum, stepTypeEnum } from './enums';
import { executions } from './executions';
import { steps } from './steps';

export const executionSteps = pgTable(
  'execution_steps',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    executionId: uuid('execution_id')
      .notNull()
      .references(() => executions.id, { onDelete: 'cascade' }),
    stepId: uuid('step_id').references(() => steps.id, {
      onDelete: 'set null',
    }),
    stepIndex: integer('step_index').notNull(),
    stepType: stepTypeEnum('step_type').notNull(),
    integration: varchar('integration').notNull(),
    eventName: varchar('event_name').notNull(),
    status: executionStatusEnum('status')
      .default(ExecutionStatus.PENDING)
      .notNull(),
    input: jsonb('input'),
    output: jsonb('output'),
    message: text('message'),
    startedAt: timestamp('started_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
    finishedAt: timestamp('finished_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (t) => [
    index('execution_steps_execution_id_idx').on(t.executionId),
    index('execution_steps_step_id_idx').on(t.stepId),
  ],
);

export const executionStepRelations = relations(executionSteps, ({ one }) => ({
  execution: one(executions, {
    fields: [executionSteps.executionId],
    references: [executions.id],
  }),
  step: one(steps, {
    fields: [executionSteps.stepId],
    references: [steps.id],
  }),
}));
