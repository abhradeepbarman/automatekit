import { relations } from 'drizzle-orm';
import {
  index,
  pgTable,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';
import { steps } from './steps';
import { workflows } from './workflows';

export const stepEdges = pgTable(
  'step_edges',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    workflowId: uuid('workflow_id')
      .notNull()
      .references(() => workflows.id, { onDelete: 'cascade' }),
    sourceStepId: uuid('source_step_id')
      .notNull()
      .references(() => steps.id, { onDelete: 'cascade' }),
    targetStepId: uuid('target_step_id')
      .notNull()
      .references(() => steps.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [
    uniqueIndex('step_edges_source_target_unq').on(
      t.sourceStepId,
      t.targetStepId,
    ),
    index('step_edges_workflow_id_idx').on(t.workflowId),
  ],
);

export const stepEdgeRelations = relations(stepEdges, ({ one }) => ({
  workflow: one(workflows, {
    fields: [stepEdges.workflowId],
    references: [workflows.id],
  }),
  source: one(steps, {
    fields: [stepEdges.sourceStepId],
    references: [steps.id],
    relationName: 'source',
  }),
  target: one(steps, {
    fields: [stepEdges.targetStepId],
    references: [steps.id],
    relationName: 'target',
  }),
}));
