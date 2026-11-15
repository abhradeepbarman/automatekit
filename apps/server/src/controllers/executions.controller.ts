import db from '@repo/db';
import { executionSteps, executions } from '@repo/db/schema';
import { and, asc, desc, eq } from 'drizzle-orm';
import { NextFunction, Request, Response } from 'express';
import { findOwnedWorkflow } from '../services';
import { asyncHandler, CustomErrorHandler, ResponseHandler } from '../utils';

const withSteps = { steps: { orderBy: asc(executionSteps.stepIndex) } };

export const getWorkflowExecutions = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const workflow = await findOwnedWorkflow(
      req.params.workflowId as string,
      req.user.id,
    );
    if (!workflow) {
      return next(CustomErrorHandler.notFound('Workflow not found'));
    }

    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
    const page = Math.max(1, Number(req.query.page) || 1);
    const where = eq(executions.workflowId, workflow.id);

    const [total, items] = await Promise.all([
      db.$count(executions, where),
      db.query.executions.findMany({
        where,
        orderBy: desc(executions.startedAt),
        limit,
        offset: (page - 1) * limit,
        with: withSteps,
      }),
    ]);

    return res.status(200).send(
      ResponseHandler(200, 'Workflow executions', {
        executions: items,
        pagination: { page, limit, total, hasMore: page * limit < total },
      }),
    );
  },
);

export const getExecution = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const workflow = await findOwnedWorkflow(
      req.params.workflowId as string,
      req.user.id,
    );
    const execution =
      workflow &&
      (await db.query.executions.findFirst({
        where: and(
          eq(executions.id, req.params.executionId as string),
          eq(executions.workflowId, workflow.id),
        ),
        with: withSteps,
      }));

    if (!execution) {
      return next(CustomErrorHandler.notFound('Execution not found'));
    }

    return res.status(200).send(ResponseHandler(200, 'Execution', execution));
  },
);
