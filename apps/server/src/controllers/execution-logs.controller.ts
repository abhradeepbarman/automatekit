import db from '@repo/db';
import { executionLogs, steps, workflows } from '@repo/db/schema';
import { and, count, desc, eq } from 'drizzle-orm';
import { NextFunction, Request, Response } from 'express';
import { asyncHandler, CustomErrorHandler, ResponseHandler } from '../utils';

export const getWorkflowExecutionLogs = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const { workflowId } = req.params;
    const { id: userId } = req.user;
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
    const page = Math.max(1, Number(req.query.offset) || 1);

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
      .from(executionLogs)
      .where(eq(executionLogs.workflowId, workflowId as string));
    const totalCount = countRow?.value ?? 0;

    const executionLogsResult = await db
      .select()
      .from(executionLogs)
      .where(eq(executionLogs.workflowId, workflowId as string))
      .limit(limit)
      .offset((page - 1) * limit)
      .orderBy(desc(executionLogs.createdAt));

    return res.status(200).send(
      ResponseHandler(200, 'Workflow execution logs', {
        executionLogs: executionLogsResult,
        pagination: {
          page,
          limit,
          total: totalCount,
          hasMore: page * limit < totalCount,
        },
      }),
    );
  },
);
