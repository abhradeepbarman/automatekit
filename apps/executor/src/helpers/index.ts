import { ExecutionStatus, StepType } from '@repo/common/types';
import { logger } from '@repo/common/utils';
import db from '@repo/db';
import { executionLogs } from '@repo/db/schema';

export async function createExecutionLog(
  workflowId: string,
  appId: string,
  stepId: string,
  stepType: StepType,
  message: string,
  jobId: string,
  status: ExecutionStatus = ExecutionStatus.PENDING,
): Promise<string> {
  try {
    if (
      !workflowId ||
      !stepId ||
      !jobId ||
      message === undefined ||
      message === null
    ) {
      logger.warn('Invalid parameters passed to createExecutionLog');
      return '';
    }

    const [newLog] = await db
      .insert(executionLogs)
      .values({ workflowId, appId, stepId, stepType, message, jobId, status })
      .returning();

    if (!newLog) return '';

    return newLog.id;
  } catch (error) {
    logger.error('Create execution log error: ' + error);
    return '';
  }
}

export function replaceVariables(
  fields: { [key: string]: string },
  variables: { id: string; data: string }[],
) {
  const variableMap: Record<string, string> = {};

  Object.entries(variables).forEach(([key, value]) => {
    variableMap[value.id] = value.data;
  });

  const result: any = {};

  Object.keys(fields).forEach((key) => {
    const value = fields[key];

    if (typeof value === 'string') {
      result[key] = value.replace(/{{(.*?)}}/g, (_, variableId) => {
        return variableMap[variableId] ?? '';
      });
    } else {
      result[key] = value;
    }
  });

  return result;
}
