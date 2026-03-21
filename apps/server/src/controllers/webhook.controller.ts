import { ExecutionStatus, StepType } from '@repo/common/types';
import db from '@repo/db';
import { executionLogs, webhooks, workflows } from '@repo/db/schema';
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

    // execution logs added
    const jobId = nanoid();
    await db.insert(executionLogs).values({
      workflowId: workflowDetails.id,
      appId: 'system',
      jobId,
      stepId: 'webhook',
      message: 'Webhook triggered successfully',
      stepType: StepType.TRIGGER,
      status: ExecutionStatus.COMPLETED,
    });

    await actionQueue.add(actionQueueName, {
      workflowId: workflowDetails.id,
      stepIndex: 1,
      jobId,
      dataAvailable: {
        input: body,
      },
    });

    return res
      .status(200)
      .send(ResponseHandler(200, 'Webhook triggered successfully'));
  },
);
