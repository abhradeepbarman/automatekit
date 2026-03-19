import db from '@repo/db';
import { workflows } from '@repo/db/schema';
import { and, eq } from 'drizzle-orm';
import { NextFunction, Request, Response } from 'express';
import { asyncHandler, CustomErrorHandler, ResponseHandler } from '../utils';

export const createWorkflow = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const body = req.body;
    const { id } = req.user;

    const [newWorkflow] = await db
      .insert(workflows)
      .values({
        name: body?.name,
        userId: id,
      })
      .returning();

    if (!newWorkflow) {
      return next(CustomErrorHandler.serverError());
    }

    return res
      .status(201)
      .send(ResponseHandler(201, 'Workflow created', newWorkflow));
  },
);

export const updateWorkflow = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const { id } = req.params;
    const { id: userId } = req.user;
    const { name, isActive } = req.body;

    if (!name && isActive === undefined) {
      return next(CustomErrorHandler.badRequest());
    }

    const workflowDetails = await db.query.workflows.findFirst({
      where: and(eq(workflows.id, id as string), eq(workflows.userId, userId)),
      with: {
        steps: true,
      },
    });

    if (!workflowDetails) {
      return next(CustomErrorHandler.notFound('Workflow not found'));
    }

    if (workflowDetails.userId !== userId) {
      return next(CustomErrorHandler.notAllowed());
    }

    if (isActive && workflowDetails.steps.length < 2) {
      return next(
        CustomErrorHandler.badRequest(
          'Workflow must have atleast a trigger & action',
        ),
      );
    }

    const [updatedWorkflow] = await db
      .update(workflows)
      .set({
        name: name ?? workflowDetails.name,
        isActive: isActive ?? workflowDetails.isActive,
        activatedAt: isActive ? new Date() : undefined,
        updatedAt: new Date(),
      })
      .where(eq(workflows.id, id as string))
      .returning();

    return res
      .status(200)
      .send(ResponseHandler(200, 'Workflow updated', updatedWorkflow));
  },
);

export const deleteWorkflow = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const { id } = req.params;
    const { id: userId } = req.user;

    const workflowDetails = await db.query.workflows.findFirst({
      where: and(eq(workflows.id, id as string), eq(workflows.userId, userId)),
    });

    if (!workflowDetails) {
      return next(CustomErrorHandler.notFound('Workflow not found'));
    }

    if (workflowDetails.userId !== userId) {
      return next(CustomErrorHandler.notAllowed());
    }

    const [deletedWorkflow] = await db
      .delete(workflows)
      .where(eq(workflows.id, id as string))
      .returning();

    return res
      .status(200)
      .send(ResponseHandler(200, 'Workflow deleted', deletedWorkflow));
  },
);

export const getWorkflow = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const { id } = req.params;
    const { id: userId } = req.user;

    const workflowDetails = await db.query.workflows.findFirst({
      where: and(eq(workflows.id, id as string), eq(workflows.userId, userId)),
      with: {
        steps: {
          orderBy: (steps, { asc }) => [asc(steps.index)],
        },
      },
    });

    if (!workflowDetails) {
      return next(CustomErrorHandler.notFound('Workflow not found'));
    }

    if (workflowDetails.userId !== userId) {
      return next(CustomErrorHandler.notAllowed());
    }

    return res
      .status(200)
      .send(ResponseHandler(200, 'Workflow details', workflowDetails));
  },
);

export const getAllWorkflows = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const { id: userId } = req.user;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const offset = (page - 1) * limit;

    const totalCountResult = await db
      .select({ value: workflows.id })
      .from(workflows)
      .where(eq(workflows.userId, userId));
    const totalCount = totalCountResult.length;

    const allWorkflows = await db.query.workflows.findMany({
      where: eq(workflows.userId, userId),
      limit,
      offset,
      orderBy: (workflows, { desc }) => [desc(workflows.createdAt)],
    });

    const totalPages = Math.ceil(totalCount / limit);

    return res.status(200).send(
      ResponseHandler(200, 'Workflows details', {
        workflows: allWorkflows,
        pagination: {
          page,
          limit,
          total: totalCount,
          totalPages,
        },
      }),
    );
  },
);
