import db from '@repo/db';
import { executionLogs, steps, workflows } from '@repo/db/schema';
import { and, desc, eq } from 'drizzle-orm';
import { NextFunction, Request, Response } from 'express';
import { asyncHandler, CustomErrorHandler, ResponseHandler } from '../utils';

export const getWorkflowExecutionLogs = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const { workflowId } = req.params;
    const { id: userId } = req.user;
    let limit: number = Number(req.query.limit) || 20;
    let offset: number = Number(req.query.offset) || 1;
    if (offset < 1) offset = 20;
    if (limit < 1) limit = 1;

    const workflow = await db.query.workflows.findFirst({
      where: and(
        eq(workflows.id, workflowId as string),
        eq(workflows.userId, userId),
      ),
    });

    if (!workflow) {
      return next(CustomErrorHandler.notFound('Workflow not found'));
    }

    const totalCountResult = await db
      .select({ value: executionLogs.id })
      .from(executionLogs)
      .where(eq(executionLogs.workflowId, workflowId as string));
    const totalCount = totalCountResult.length;

    const executionLogsResult = await db
      .select()
      .from(executionLogs)
      .where(eq(executionLogs.workflowId, workflowId as string))
      .limit(limit)
      .offset((offset - 1) * limit)
      .orderBy(desc(executionLogs.createdAt));

    return res.status(200).send(
      ResponseHandler(200, 'Workflow execution logs', {
        executionLogs: executionLogsResult,
        pagination: {
          page: offset,
          limit,
          hasMore: offset * limit < totalCount,
        },
      }),
    );
  },
);
