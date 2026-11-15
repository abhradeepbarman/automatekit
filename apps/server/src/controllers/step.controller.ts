import { addStepSchema, updateStepSchema } from '@repo/common/validators';
import db from '@repo/db';
import { connections, steps, webhooks, workflows } from '@repo/db/schema';
import { and, eq, gte } from 'drizzle-orm';
import { NextFunction, Request, Response } from 'express';
import { asyncHandler, CustomErrorHandler, ResponseHandler } from '../utils';
import { AppType, SystemEvent } from '@repo/common/types';
import { getEventSchema } from '@repo/integrations/schemas';
import { nanoid } from 'nanoid';
import { envConfig } from '../config/env';

const isConnectionOwnedByUser = async (
  connectionId: string,
  userId: string,
) => {
  const connection = await db.query.connections.findFirst({
    where: and(
      eq(connections.id, connectionId),
      eq(connections.userId, userId),
    ),
  });
  return Boolean(connection);
};

export const addStep = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const { id: workflowId } = req.params;
    const body = addStepSchema.parse(req.body);
    let { integration, eventName, metadata, index, type, connectionId } = body;

    const workflowDetails = await db.query.workflows.findFirst({
      where: and(eq(workflows.id, workflowId as string)),
    });

    if (!workflowDetails) {
      return next(CustomErrorHandler.notFound('Workflow not found'));
    }

    if (workflowDetails.userId !== req.user.id) {
      return next(CustomErrorHandler.notAllowed());
    }

    const eventSchema = getEventSchema(integration, eventName);
    if (
      eventSchema &&
      !eventSchema.safeParse(metadata?.data?.fields ?? {}).success
    ) {
      return next(CustomErrorHandler.badRequest('Invalid step configuration'));
    }

    if (
      connectionId &&
      !(await isConnectionOwnedByUser(connectionId, req.user.id))
    ) {
      return next(CustomErrorHandler.notAllowed('Invalid connection'));
    }

    let [newStep] = await db
      .insert(steps)
      .values({
        workflowId: workflowId as string,
        integration,
        eventName,
        metadata,
        index: index,
        type,
        connectionId: connectionId || undefined,
      })
      .returning();

    if (!newStep) {
      return next(CustomErrorHandler.serverError());
    }

    metadata = {
      ...metadata,
      id: newStep.id,
    };

    const [updatedStep] = await db
      .update(steps)
      .set({ metadata })
      .where(eq(steps.id, newStep.id))
      .returning();
    newStep = updatedStep;

    if (!newStep) {
      return next(CustomErrorHandler.serverError());
    }

    if (integration === AppType.SYSTEM && eventName === SystemEvent.WEBHOOK) {
      const path = nanoid();
      const [newWebhook] = await db
        .insert(webhooks)
        .values({
          workflowId: workflowId as string,
          stepId: newStep.id,
          path,
        })
        .returning();

      if (!newWebhook) {
        return next(CustomErrorHandler.serverError());
      }

      metadata = {
        ...metadata,
        data: {
          ...metadata.data,
          webhook: {
            id: newWebhook.id,
            method: newWebhook.method,
            url: `${envConfig.API_URL}/api/v1/webhook/${path}`,
          },
        },
      };

      const [updatedStep] = await db
        .update(steps)
        .set({ metadata })
        .where(eq(steps.id, newStep.id))
        .returning();
      newStep = updatedStep;
    }

    return res
      .status(201)
      .send(ResponseHandler(201, 'Step added successfully', newStep));
  },
);

export const getStep = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const { id: stepId } = req.params;
    const { id: userId } = req.user;

    const stepDetails = await db.query.steps.findFirst({
      where: and(eq(steps.id, stepId as string)),
      with: {
        workflow: true,
      },
    });

    if (!stepDetails) {
      return next(CustomErrorHandler.notFound('Step not found'));
    }

    if (stepDetails.workflow.userId != userId) {
      return next(CustomErrorHandler.notAllowed());
    }

    return res
      .status(200)
      .send(ResponseHandler(200, 'Step fetched successfully', stepDetails));
  },
);

export const deleteStep = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const { id: stepId } = req.params;

    const stepDetails = await db.query.steps.findFirst({
      where: and(eq(steps.id, stepId as string)),
      with: {
        workflow: true,
      },
    });

    if (!stepDetails) {
      return next(CustomErrorHandler.notFound('Step not found'));
    }

    if (stepDetails.workflow.userId !== req.user.id) {
      return next(CustomErrorHandler.notAllowed());
    }

    const deletedSteps = await db
      .delete(steps)
      .where(
        and(
          eq(steps.workflowId, stepDetails.workflowId),
          gte(steps.index, stepDetails.index),
        ),
      )
      .returning();

    if (stepDetails.index <= 1) {
      await db
        .update(workflows)
        .set({
          isActive: false,
        })
        .where(eq(workflows.id, stepDetails.workflowId));
    }

    return res
      .status(200)
      .send(ResponseHandler(200, 'Step deleted successfully', deletedSteps));
  },
);

export const updateStep = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const { id: stepId } = req.params;
    const body = updateStepSchema.parse(req.body);

    const stepDetails = await db.query.steps.findFirst({
      where: and(eq(steps.id, stepId as string)),
      with: {
        workflow: true,
      },
    });

    if (!stepDetails) {
      return next(CustomErrorHandler.notFound('Step not found'));
    }

    if (stepDetails.workflow.userId !== req.user.id) {
      return next(CustomErrorHandler.notAllowed());
    }

    if (
      body.connectionId &&
      !(await isConnectionOwnedByUser(body.connectionId, req.user.id))
    ) {
      return next(CustomErrorHandler.notAllowed('Invalid connection'));
    }

    const [updatedStep] = await db
      .update(steps)
      .set(body)
      .where(eq(steps.id, stepId as string))
      .returning();

    return res
      .status(200)
      .send(ResponseHandler(200, 'Step updated successfully', updatedStep));
  },
);
