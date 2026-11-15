import { AppType, SystemEvent } from '@repo/common/types';
import db from '@repo/db';
import { webhooks } from '@repo/db/schema';
import type { WebhookConfig } from '@repo/integrations/schemas';
import { createHash, timingSafeEqual } from 'crypto';
import { eq, sql } from 'drizzle-orm';
import { NextFunction, Request, Response } from 'express';
import { startExecution } from '../services';
import { asyncHandler, CustomErrorHandler, ResponseHandler } from '../utils';

const sha256 = (value: string) => createHash('sha256').update(value).digest();
const safeEqual = (a: string, b: string) =>
  timingSafeEqual(sha256(a), sha256(b));

const HIDDEN_HEADERS = ['cookie', 'authorization'];

export const webhookListener = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const webhook = await db.query.webhooks.findFirst({
      where: eq(webhooks.path, req.params.path as string),
      with: { step: true, workflow: true },
    });
    if (!webhook) {
      return next(CustomErrorHandler.notFound('Webhook not found'));
    }

    const { method, headerName, headerValue } = webhook.step
      .config as WebhookConfig;

    if (req.method !== method) {
      return next(
        new CustomErrorHandler(
          405,
          `This webhook only accepts ${method} requests`,
        ),
      );
    }

    if (headerName && !safeEqual(req.get(headerName) ?? '', headerValue)) {
      return next(CustomErrorHandler.unAuthorized('Invalid webhook header'));
    }

    if (!webhook.workflow.isActive) {
      return next(CustomErrorHandler.notAllowed('Workflow is not active'));
    }

    const hidden = [...HIDDEN_HEADERS, headerName.toLowerCase()];
    const headers = Object.fromEntries(
      Object.entries(req.headers).filter(([key]) => !hidden.includes(key)),
    );

    await db
      .update(webhooks)
      .set({
        lastTriggeredAt: new Date(),
        triggerCount: sql`${webhooks.triggerCount} + 1`,
      })
      .where(eq(webhooks.id, webhook.id));

    const executionId = await startExecution(
      {
        id: webhook.stepId,
        workflowId: webhook.workflowId,
        integration: AppType.SYSTEM,
        eventName: SystemEvent.WEBHOOK,
      },
      { body: req.body ?? {}, query: req.query, headers },
      `${req.method} request received`,
    );

    return res
      .status(202)
      .send(ResponseHandler(202, 'Webhook received', { executionId }));
  },
);
