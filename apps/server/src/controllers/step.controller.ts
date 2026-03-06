import { addStepSchema, updateStepSchema } from '@repo/common/validators';
import db from '@repo/db';
import { steps, webhooks, workflows } from '@repo/db/schema';
import { and, eq, gte } from 'drizzle-orm';
import { NextFunction, Request, Response } from 'express';
import { asyncHandler, CustomErrorHandler, ResponseHandler } from '../utils';
import { AppType } from '@repo/common/types';
import { nanoid } from 'nanoid';
import config from '../config';

export const addStep = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const { id: workflowId } = req.params;
    const body = addStepSchema.parse(req.body);
    let { app, stepId, metadata, index, type, connectionId } = body;

    const workflowDetails = await db.query.workflows.findFirst({
      where: and(eq(workflows.id, workflowId as string)),
    });

    if (!workflowDetails) {
      return next(CustomErrorHandler.notFound('Workflow not found'));
    }

    if (workflowDetails.userId !== req.user.id) {
      return next(CustomErrorHandler.notAllowed());
    }

    if (app == AppType.SYSTEM && stepId == 'webhook') {
      const path = nanoid();
      const [newWebhook] = await db
        .insert(webhooks)
        .values({
          workflowId: workflowId as string,
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
            url: `${config.API_URL}/api/v1/webhook/${path}`,
          },
        },
      };
    }

    const [newStep] = await db
      .insert(steps)
      .values({
        workflowId: workflowId as string,
        app,
        stepId,
        metadata,
        index: index,
        type,
        connectionId: connectionId || undefined,
      })
      .returning();

    if (!newStep) {
      return next(CustomErrorHandler.serverError());
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
        workflows: true,
      },
    });

    if (!stepDetails) {
      return next(CustomErrorHandler.notFound('Step not found'));
    }

    if (stepDetails.workflows.userId != userId) {
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
        workflows: true,
      },
    });

    if (!stepDetails) {
      return next(CustomErrorHandler.notFound('Step not found'));
    }

    if (stepDetails.workflows.userId !== req.user.id) {
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
        workflows: true,
      },
    });

    if (!stepDetails) {
      return next(CustomErrorHandler.notFound('Step not found'));
    }

    if (stepDetails.workflows.userId !== req.user.id) {
      return next(CustomErrorHandler.notAllowed());
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
