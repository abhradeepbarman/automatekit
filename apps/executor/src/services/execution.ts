import { ExecutionStatus, StepType } from '@repo/common/types';
import db from '@repo/db';
import { executionSteps, executions, workflows } from '@repo/db/schema';
import { eq } from 'drizzle-orm';

interface StepInfo {
  id: string;
  index: number;
  type: StepType;
  integration: string;
  eventName: string;
}

export async function createExecution(
  workflowId: string,
  triggerData: unknown,
): Promise<string> {
  const [execution] = await db
    .insert(executions)
    .values({ workflowId, status: ExecutionStatus.RUNNING, triggerData })
    .returning({ id: executions.id });

  if (!execution) throw new Error('Failed to create execution');

  await db
    .update(workflows)
    .set({ lastExecutedAt: new Date() })
    .where(eq(workflows.id, workflowId));

  return execution.id;
}

export async function finishExecution(
  executionId: string,
  status: ExecutionStatus.COMPLETED | ExecutionStatus.FAILED,
  error?: string,
) {
  await db
    .update(executions)
    .set({ status, error, finishedAt: new Date() })
    .where(eq(executions.id, executionId));
}

export async function startExecutionStep(
  executionId: string,
  step: StepInfo,
  input?: unknown,
): Promise<string> {
  const [executionStep] = await db
    .insert(executionSteps)
    .values({
      executionId,
      stepId: step.id,
      stepIndex: step.index,
      stepType: step.type,
      integration: step.integration,
      eventName: step.eventName,
      status: ExecutionStatus.RUNNING,
      input,
    })
    .returning({ id: executionSteps.id });

  if (!executionStep) throw new Error('Failed to create execution step');
  return executionStep.id;
}

export async function finishExecutionStep(
  executionStepId: string,
  result: {
    status: ExecutionStatus.COMPLETED | ExecutionStatus.FAILED;
    message?: string;
    output?: unknown;
  },
) {
  await db
    .update(executionSteps)
    .set({ ...result, finishedAt: new Date() })
    .where(eq(executionSteps.id, executionStepId));
}

export async function failExecution(
  executionId: string,
  executionStepId: string,
  message: string,
) {
  await finishExecutionStep(executionStepId, {
    status: ExecutionStatus.FAILED,
    message,
  });
  await finishExecution(executionId, ExecutionStatus.FAILED, message);
}
