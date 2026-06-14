import db from '@repo/db';
import { executionLogs, workflows } from '@repo/db/schema';
import { and, eq, gt, sql } from 'drizzle-orm';
import { NextFunction, Request, Response } from 'express';
import { asyncHandler, ResponseHandler } from '../utils';
import { ExecutionStatus } from '@repo/common/types';

export const getDashboardStats = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const userId = req.user.id;
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    // Get total workflows (all time)
    const workflowsCount = await db.$count(
      workflows,
      eq(workflows.userId, userId),
    );

    // Get total runs in last 30 days
    const [runsCount] = await db
      .select({ count: sql<number>`count(*)` })
      .from(executionLogs)
      .innerJoin(workflows, eq(executionLogs.workflowId, workflows.id))
      .where(
        and(
          eq(workflows.userId, userId),
          gt(executionLogs.createdAt, thirtyDaysAgo),
        ),
      );

    // Get total errors in last 30 days
    const [errorsCount] = await db
      .select({ count: sql<number>`count(*)` })
      .from(executionLogs)
      .innerJoin(workflows, eq(executionLogs.workflowId, workflows.id))
      .where(
        and(
          eq(workflows.userId, userId),
          gt(executionLogs.createdAt, thirtyDaysAgo),
          eq(executionLogs.status, ExecutionStatus.FAILED),
        ),
      );

    return res.status(200).send(
      ResponseHandler(200, 'Dashboard stats fetched successfully', {
        totalWorkflows: Number(workflowsCount || 0),
        totalRuns: Number(runsCount?.count ?? 0),
        totalErrors: Number(errorsCount?.count ?? 0),
      }),
    );
  },
);
