import db from '@repo/db';
import { executionSteps, executions, workflows } from '@repo/db/schema';
import { and, asc, count, desc, eq } from 'drizzle-orm';
import { NextFunction, Request, Response } from 'express';
import { asyncHandler, CustomErrorHandler, ResponseHandler } from '../utils';

export const getWorkflowExecutions = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const { workflowId } = req.params;
    const { id: userId } = req.user;
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
    const page = Math.max(1, Number(req.query.page) || 1);

    const workflow = await db.query.workflows.findFirst({
      where: and(
        eq(workflows.id, workflowId as string),
        eq(workflows.userId, userId),
      ),
    });

    if (!workflow) {
      return next(CustomErrorHandler.notFound('Workflow not found'));
    }

    const [countRow] = await db
      .select({ value: count() })
      .from(executions)
      .where(eq(executions.workflowId, workflow.id));
    const total = countRow?.value ?? 0;

    const items = await db.query.executions.findMany({
      where: eq(executions.workflowId, workflow.id),
      orderBy: desc(executions.startedAt),
      limit,
      offset: (page - 1) * limit,
      with: {
        steps: {
          orderBy: asc(executionSteps.stepIndex),
        },
      },
    });

    return res.status(200).send(
      ResponseHandler(200, 'Workflow executions', {
        executions: items,
        pagination: {
          page,
          limit,
          total,
          hasMore: page * limit < total,
        },
      }),
    );
  },
);
