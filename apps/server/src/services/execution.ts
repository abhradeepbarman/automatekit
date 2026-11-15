import { ExecutionStatus, StepType } from '@repo/common/types';
import db from '@repo/db';
import { executionSteps, executions, workflows } from '@repo/db/schema';
import { actionQueue, actionQueueName } from '@repo/queue';
import { eq } from 'drizzle-orm';

interface TriggerStep {
  id: string;
  workflowId: string;
  integration: string;
  eventName: string;
}

export const startExecution = async (
  trigger: TriggerStep,
  triggerData: unknown,
  message: string,
) => {
  const execution = await db.transaction(async (tx) => {
    const [created] = await tx
      .insert(executions)
      .values({
        workflowId: trigger.workflowId,
        status: ExecutionStatus.RUNNING,
        triggerData,
      })
      .returning({ id: executions.id });

    if (!created) throw new Error('Failed to create execution');

    await tx.insert(executionSteps).values({
      executionId: created.id,
      stepId: trigger.id,
      stepIndex: 0,
      stepType: StepType.TRIGGER,
      integration: trigger.integration,
      eventName: trigger.eventName,
      status: ExecutionStatus.COMPLETED,
      output: triggerData,
      message,
      finishedAt: new Date(),
    });

    await tx
      .update(workflows)
      .set({ lastExecutedAt: new Date() })
      .where(eq(workflows.id, trigger.workflowId));

    return created;
  });

  await actionQueue.add(actionQueueName, {
    workflowId: trigger.workflowId,
    executionId: execution.id,
    stepIndex: 1,
    dataAvailable: triggerData,
  });

  return execution.id;
};
