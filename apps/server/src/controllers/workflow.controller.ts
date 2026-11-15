import { SystemEvent } from '@repo/common/types';
import { saveWorkflowStepsSchema } from '@repo/common/validators';
import db from '@repo/db';
import { steps, workflows } from '@repo/db/schema';
import { and, asc, desc, eq } from 'drizzle-orm';
import { NextFunction, Request, Response } from 'express';
import { envConfig } from '../config/env';
import {
  findOwnedWorkflow,
  saveWorkflowGraph,
  startExecution,
} from '../services';
import { asyncHandler, CustomErrorHandler, ResponseHandler } from '../utils';

const getWorkflowDetails = async (id: string) => {
  const workflow = await db.query.workflows.findFirst({
    where: eq(workflows.id, id),
    with: {
      steps: { orderBy: asc(steps.index), with: { webhook: true } },
      edges: { columns: { sourceStepId: true, targetStepId: true } },
    },
  });
  if (!workflow) return null;

  return {
    ...workflow,
    steps: workflow.steps.map(({ webhook, ...step }) => ({
      ...step,
      webhook: webhook && {
        url: `${envConfig.API_URL}/api/v1/webhook/${webhook.path}`,
      },
    })),
    edges: workflow.edges.map((edge) => ({
      source: edge.sourceStepId,
      target: edge.targetStepId,
    })),
  };
};

export const createWorkflow = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const [workflow] = await db
      .insert(workflows)
      .values({ name: req.body?.name, userId: req.user.id })
      .returning();

    if (!workflow) return next(CustomErrorHandler.serverError());

    return res
      .status(201)
      .send(ResponseHandler(201, 'Workflow created', workflow));
  },
);

export const getWorkflow = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const workflow = await findOwnedWorkflow(
      req.params.id as string,
      req.user.id,
    );
    if (!workflow)
      return next(CustomErrorHandler.notFound('Workflow not found'));

    return res
      .status(200)
      .send(
        ResponseHandler(
          200,
          'Workflow details',
          await getWorkflowDetails(workflow.id),
        ),
      );
  },
);

export const getAllWorkflows = asyncHandler(
  async (req: Request, res: Response) => {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 10));
    const where = eq(workflows.userId, req.user.id);

    const [total, items] = await Promise.all([
      db.$count(workflows, where),
      db.query.workflows.findMany({
        where,
        limit,
        offset: (page - 1) * limit,
        orderBy: desc(workflows.createdAt),
      }),
    ]);

    return res.status(200).send(
      ResponseHandler(200, 'Workflows details', {
        workflows: items,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      }),
    );
  },
);

export const updateWorkflow = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const { name, isActive } = req.body;
    if (!name && isActive === undefined)
      return next(CustomErrorHandler.badRequest());

    const workflow = await findOwnedWorkflow(
      req.params.id as string,
      req.user.id,
    );
    if (!workflow)
      return next(CustomErrorHandler.notFound('Workflow not found'));

    if (isActive) {
      const stepCount = await db.$count(
        steps,
        eq(steps.workflowId, workflow.id),
      );
      if (stepCount < 2) {
        return next(
          CustomErrorHandler.badRequest(
            'Add a trigger and at least one action first',
          ),
        );
      }
    }

    const [updated] = await db
      .update(workflows)
      .set({
        name: name ?? workflow.name,
        isActive: isActive ?? workflow.isActive,
        activatedAt: isActive ? new Date() : workflow.activatedAt,
      })
      .where(eq(workflows.id, workflow.id))
      .returning();

    return res
      .status(200)
      .send(ResponseHandler(200, 'Workflow updated', updated));
  },
);

export const deleteWorkflow = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const workflow = await findOwnedWorkflow(
      req.params.id as string,
      req.user.id,
    );
    if (!workflow)
      return next(CustomErrorHandler.notFound('Workflow not found'));

    await db.delete(workflows).where(eq(workflows.id, workflow.id));

    return res
      .status(200)
      .send(ResponseHandler(200, 'Workflow deleted', workflow));
  },
);

export const saveWorkflowSteps = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const workflow = await findOwnedWorkflow(
      req.params.id as string,
      req.user.id,
    );
    if (!workflow) {
      return next(CustomErrorHandler.notFound('Workflow not found'));
    }

    await saveWorkflowGraph(
      workflow,
      req.user.id,
      saveWorkflowStepsSchema.parse(req.body),
    );

    return res
      .status(200)
      .send(
        ResponseHandler(
          200,
          'Workflow saved',
          await getWorkflowDetails(workflow.id),
        ),
      );
  },
);

export const runWorkflow = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const workflow = await findOwnedWorkflow(
      req.params.id as string,
      req.user.id,
    );
    if (!workflow)
      return next(CustomErrorHandler.notFound('Workflow not found'));

    const trigger = await db.query.steps.findFirst({
      where: and(eq(steps.workflowId, workflow.id), eq(steps.index, 0)),
    });
    if (trigger?.eventName !== SystemEvent.TAP) {
      return next(
        CustomErrorHandler.badRequest('This workflow is not started by tap'),
      );
    }
    if (!workflow.isActive) {
      return next(
        CustomErrorHandler.notAllowed('Activate the workflow to run it'),
      );
    }

    const executionId = await startExecution(
      trigger,
      { tappedAt: new Date().toISOString() },
      'Tapped',
    );

    return res
      .status(200)
      .send(ResponseHandler(200, 'Workflow started', { executionId }));
  },
);
