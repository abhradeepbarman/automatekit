import { StepType, SystemEvent } from '@repo/common/types';
import type { SaveWorkflowSteps } from '@repo/common/validators';
import db from '@repo/db';
import {
  connections,
  stepEdges,
  steps,
  webhooks,
  workflows,
} from '@repo/db/schema';
import apps from '@repo/integrations';
import { and, eq, inArray, ne, notInArray, sql } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { CustomErrorHandler, topoSort } from '../utils';

type Workflow = typeof workflows.$inferSelect;

export const findOwnedWorkflow = (id: string, userId: string) =>
  db.query.workflows.findFirst({
    where: and(eq(workflows.id, id), eq(workflows.userId, userId)),
  });

const validateSteps = async (
  workflowId: string,
  userId: string,
  input: SaveWorkflowSteps,
) => {
  for (const step of input.steps) {
    const app = apps.find((a) => a.id === step.integration);
    const event = (
      step.type === StepType.TRIGGER ? app?.triggers : app?.actions
    )?.find((e) => e.id === step.eventName);

    if (!app || !event) {
      throw CustomErrorHandler.badRequest(
        `Unknown event ${step.integration}/${step.eventName}`,
      );
    }
    if (event.schema && !event.schema.safeParse(step.config).success) {
      throw CustomErrorHandler.badRequest(
        `${event.name} is not configured correctly`,
      );
    }
    if (app.auth && !step.connectionId) {
      throw CustomErrorHandler.badRequest(
        `${event.name} needs a connected account`,
      );
    }
  }

  const stepIds = input.steps.map((step) => step.id);
  const connectionIds = [
    ...new Set(input.steps.flatMap((step) => step.connectionId ?? [])),
  ];

  const [ownedConnections, foreignSteps] = await Promise.all([
    connectionIds.length
      ? db.$count(
          connections,
          and(
            inArray(connections.id, connectionIds),
            eq(connections.userId, userId),
          ),
        )
      : 0,
    stepIds.length
      ? db.$count(
          steps,
          and(inArray(steps.id, stepIds), ne(steps.workflowId, workflowId)),
        )
      : 0,
  ]);

  if (ownedConnections !== connectionIds.length) {
    throw CustomErrorHandler.notAllowed('Invalid connection');
  }
  if (foreignSteps > 0) {
    throw CustomErrorHandler.badRequest('Invalid step id');
  }
};

export const saveWorkflowGraph = async (
  workflow: Workflow,
  userId: string,
  input: SaveWorkflowSteps,
) => {
  const order = topoSort(input.steps, input.edges);
  await validateSteps(workflow.id, userId, input);

  await db.transaction(async (tx) => {
    await tx
      .delete(steps)
      .where(
        and(eq(steps.workflowId, workflow.id), notInArray(steps.id, order)),
      );

    if (input.steps.length > 0) {
      await tx
        .insert(steps)
        .values(
          input.steps.map((step) => ({
            ...step,
            workflowId: workflow.id,
            connectionId: step.connectionId ?? null,
            index: order.indexOf(step.id),
          })),
        )
        .onConflictDoUpdate({
          target: steps.id,
          set: {
            type: sql`excluded.type`,
            index: sql`excluded.index`,
            integration: sql`excluded.integration`,
            eventName: sql`excluded.event_name`,
            connectionId: sql`excluded.connection_id`,
            config: sql`excluded.config`,
            position: sql`excluded.position`,
            updatedAt: new Date(),
          },
        });
    }

    await tx.delete(stepEdges).where(eq(stepEdges.workflowId, workflow.id));
    if (input.edges.length > 0) {
      await tx.insert(stepEdges).values(
        input.edges.map((edge) => ({
          workflowId: workflow.id,
          sourceStepId: edge.source,
          targetStepId: edge.target,
        })),
      );
    }

    const trigger = input.steps.find((s) => s.type === StepType.TRIGGER);
    if (trigger?.eventName === SystemEvent.WEBHOOK) {
      await tx
        .insert(webhooks)
        .values({ workflowId: workflow.id, stepId: trigger.id, path: nanoid() })
        .onConflictDoNothing({ target: webhooks.stepId });
    }

    if (input.steps.length < 2 && workflow.isActive) {
      await tx
        .update(workflows)
        .set({ isActive: false })
        .where(eq(workflows.id, workflow.id));
    }
  });
};
