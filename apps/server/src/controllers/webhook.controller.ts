import db from '@repo/db';
import { webhooks, workflows } from '@repo/db/schema';
import { actionQueue, actionQueueName } from '@repo/queue';
import { and, eq } from 'drizzle-orm';
import { NextFunction, Request, Response } from 'express';
import { nanoid } from 'nanoid';
import { asyncHandler, CustomErrorHandler, ResponseHandler } from '../utils';

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

    await actionQueue.add(actionQueueName, {
      workflowId: workflowDetails.id,
      stepIndex: 1,
      jobId: nanoid(),
      dataAvailable: {
        id: 'input',
        data: body,
      },
    });

    return res
      .status(200)
      .send(ResponseHandler(200, 'Webhook triggered successfully'));
  },
);
