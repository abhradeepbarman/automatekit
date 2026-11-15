import {
  AppType,
  ExecutionStatus,
  StepType,
  SystemEvent,
} from '@repo/common/types';
import db from '@repo/db';
import {
  executionSteps,
  executions,
  webhooks,
  workflows,
} from '@repo/db/schema';
import { actionQueue, actionQueueName } from '@repo/queue';
import { eq, sql } from 'drizzle-orm';
import { NextFunction, Request, Response } from 'express';
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

    const execution = await db.transaction(async (tx) => {
      const [created] = await tx
        .insert(executions)
        .values({
          workflowId: workflowDetails.id,
          status: ExecutionStatus.RUNNING,
          triggerData,
        })
        .returning({ id: executions.id });

      if (!created) throw new Error('Failed to create execution');

      await tx.insert(executionSteps).values({
        executionId: created.id,
        stepId: webhookDetails.stepId,
        stepIndex: 0,
        stepType: StepType.TRIGGER,
        integration: AppType.SYSTEM,
        eventName: SystemEvent.WEBHOOK,
        status: ExecutionStatus.COMPLETED,
        output: triggerData,
        message: 'Webhook received',
        finishedAt: new Date(),
      });

      await tx
        .update(workflows)
        .set({ lastExecutedAt: new Date() })
        .where(eq(workflows.id, workflowDetails.id));

      await tx
        .update(webhooks)
        .set({
          lastTriggeredAt: new Date(),
          triggerCount: sql`${webhooks.triggerCount} + 1`,
        })
        .where(eq(webhooks.id, webhookDetails.id));

      return created;
    });

    await actionQueue.add(actionQueueName, {
      workflowId: workflowDetails.id,
      executionId: execution.id,
      stepIndex: 1,
      dataAvailable: triggerData,
    });

    return res
      .status(200)
      .send(ResponseHandler(200, 'Webhook triggered successfully'));
  },
);
