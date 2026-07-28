import { ExecutionStatus, StepType } from '@repo/common/types';
import { logger } from '@repo/common/utils';
import db from '@repo/db';
import { executionLogs } from '@repo/db/schema';

export async function createExecutionLog(
  workflowId: string,
  app: string,
  stepId: string | null,
  eventName: string,
  stepType: StepType,
  message: string,
  jobId: string,
  status: ExecutionStatus = ExecutionStatus.PENDING,
): Promise<string> {
  try {
    if (!workflowId || !jobId || message === undefined || message === null) {
      logger.warn('Invalid parameters passed to createExecutionLog');
      return '';
    }

    const [newLog] = await db
      .insert(executionLogs)
      .values({
        workflowId,
        app,
        stepId,
        eventName,
        stepType,
        message,
        jobId,
        status,
      })
      .returning();

    if (!newLog) return '';

    return newLog.id;
  } catch (error) {
    logger.error('Create execution log error: ' + error);
    return '';
  }
}

export function replaceVariables<T>(fields: T, variables: unknown): T {
  const lookup: Record<string, any> =
    variables && typeof variables === 'object'
      ? (variables as Record<string, any>)
      : {};

  const substitute = (value: any): any => {
    if (typeof value === 'string') {
      return value.replace(/{{(.*?)}}/g, (_match, variableId) => {
        const resolved = lookup[String(variableId).trim()];
        if (resolved === undefined || resolved === null) return '';
        return typeof resolved === 'object'
          ? JSON.stringify(resolved)
          : String(resolved);
      });
    }

    if (Array.isArray(value)) {
      return value.map(substitute);
    }

    if (value && typeof value === 'object' && value.constructor === Object) {
      return Object.fromEntries(
        Object.entries(value).map(([key, inner]) => [key, substitute(inner)]),
      );
    }

    return value;
  };

  return substitute(fields) as T;
}
