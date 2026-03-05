import { NextFunction, Request, Response } from 'express';
import { asyncHandler, CustomErrorHandler, ResponseHandler } from '../utils';
import db from '@repo/db';
import { and } from 'drizzle-orm';
import { eq } from 'drizzle-orm';
import { steps, webhooks, workflows } from '@repo/db/schema';
import { nanoid } from 'nanoid';
import config from '../config';
import { AppType } from '@repo/common/types';

export const createWebhook = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const { id: workflowId } = req.params;
    const { id: userId } = req.user;

    const workflowDetails = await db.query.workflows.findFirst({
      where: and(eq(workflows.id, workflowId as string)),
    });

    if (!workflowDetails) {
      return next(CustomErrorHandler.notFound('Workflow not found'));
    }

    if (workflowDetails.userId !== userId) {
      return next(CustomErrorHandler.notAllowed());
    }

    const path = nanoid();
    const url = `${config.API_URL}/api/v1/webhook/${path}`;

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

    return res.status(200).send(
      ResponseHandler(200, 'Webhook created successfully', {
        id: newWebhook.id,
        url,
      }),
    );
  },
);

export const webhookListener = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const { path } = req.params;
    const body = req.body;

    const webhookDetails = await db.query.webhooks.findFirst({
      where: and(eq(webhooks.path, path as string)),
    });

    if (!webhookDetails) {
      return next(CustomErrorHandler.notFound('Webhook not found'));
    }

    const workflowDetails = await db.query.workflows.findFirst({
      where: and(eq(workflows.id, webhookDetails.workflowId)),
    });

    if (!workflowDetails) {
      return next(CustomErrorHandler.notFound('Workflow not found'));
    }

    const allSteps = await db.query.steps.findMany({
      where: and(eq(steps.workflowId, workflowDetails.id)),
      orderBy: (steps, { asc }) => [asc(steps.index)],
    });

    const firstStep = allSteps[0];
    if (firstStep?.app !== AppType.SYSTEM) {
      return next(CustomErrorHandler.notFound('Workflow not found'));
    }

    return res
      .status(200)
      .send(ResponseHandler(200, 'Webhook triggered successfully'));
  },
);
