import { AppType, SystemEvent } from '@repo/common/types';
import db from '@repo/db';
import { webhooks, workflows } from '@repo/db/schema';
import { eq, sql } from 'drizzle-orm';
import { NextFunction, Request, Response } from 'express';
import { startExecution } from '../services';
import { asyncHandler, CustomErrorHandler, ResponseHandler } from '../utils';

export const webhookListener = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const { path } = req.params;

    const webhookDetails = await db.query.webhooks.findFirst({
      where: eq(webhooks.path, path as string),
    });

    if (!webhookDetails) {
      return next(CustomErrorHandler.notFound('Webhook not found'));
    }

    if (req.method !== webhookDetails.method) {
      return next(
        CustomErrorHandler.notAllowed(
          `This webhook only accepts ${webhookDetails.method} requests`,
        ),
      );
    }

    const workflowDetails = await db.query.workflows.findFirst({
      where: eq(workflows.id, webhookDetails.workflowId),
    });

    if (!workflowDetails) {
      return next(CustomErrorHandler.notFound('Workflow not found'));
    }

    if (!workflowDetails.isActive) {
      return next(CustomErrorHandler.notAllowed('Workflow is not active'));
    }

    const triggerData = {
      input: req.method === 'GET' ? req.query : req.body,
    };

    await db
      .update(webhooks)
      .set({
        lastTriggeredAt: new Date(),
        triggerCount: sql`${webhooks.triggerCount} + 1`,
      })
      .where(eq(webhooks.id, webhookDetails.id));

    await startExecution(
      {
        id: webhookDetails.stepId,
        workflowId: workflowDetails.id,
        integration: AppType.SYSTEM,
        eventName: SystemEvent.WEBHOOK,
      },
      triggerData,
      'Webhook received',
    );

    return res
      .status(200)
      .send(ResponseHandler(200, 'Webhook triggered successfully'));
  },
);
