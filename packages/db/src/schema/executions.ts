import { ExecutionStatus } from '@repo/common/types';
import { relations } from 'drizzle-orm';
import {
  index,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core';
import { executionStatusEnum } from './enums';
import { executionSteps } from './execution-steps';
import { workflows } from './workflows';

export const executions = pgTable(
  'executions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    workflowId: uuid('workflow_id')
      .notNull()
      .references(() => workflows.id, { onDelete: 'cascade' }),
    status: executionStatusEnum('status')
      .default(ExecutionStatus.PENDING)
      .notNull(),
    triggerData: jsonb('trigger_data'),
    error: text('error'),
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
    index('executions_workflow_id_started_at_idx').on(
      t.workflowId,
      t.startedAt,
    ),
  ],
);

export const executionRelations = relations(executions, ({ one, many }) => ({
  workflow: one(workflows, {
    fields: [executions.workflowId],
    references: [workflows.id],
  }),
  steps: many(executionSteps),
}));
