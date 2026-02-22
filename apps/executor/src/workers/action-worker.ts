import apps from '@repo/common/@apps';
import { ExecutionStatus, StepType } from '@repo/common/types';
import db from '@repo/db';
import { executionLogs, steps } from '@repo/db/schema';
import { Job, Worker } from 'bullmq';
import { and, eq } from 'drizzle-orm';
import config from '../config';
import { actionQueue, queueName } from '../queue';
import { getRefreshTokenAndUpdate } from '../utils';

interface ActionJobData {
  stepId: string;
  jobId: string;
}

async function updateExecutionLog(
  logId: string,
  status: ExecutionStatus,
  message: string,
) {
  await db
    .update(executionLogs)
    .set({ status, message })
    .where(eq(executionLogs.id, logId));
}

async function queueNextStep(
  stepDetails: any,
  workflowDetails: any,
  jobId: string,
): Promise<boolean> {
  const nextStepDetails = await db.query.steps.findFirst({
    where: and(
      eq(steps.workflowId, workflowDetails.id),
      eq(steps.index, stepDetails.index + 1),
    ),
  });

  if (!nextStepDetails) {
    console.log(
      `No next step found after step ${stepDetails.id} (index ${stepDetails.index})`,
    );
    return false;
  }

  console.log(`Queueing next step ${nextStepDetails.id}`);
  await actionQueue.add(queueName, {
    stepId: nextStepDetails.id,
    jobId,
  });

  return true;
}

async function handleSuccessfulAction(
  stepDetails: any,
  workflowDetails: any,
  actionDetails: any,
  log: any,
  jobId: string,
  message: string,
) {
  console.log(
    `Action ${actionDetails.id} completed successfully for step ${stepDetails.id}`,
  );

  await updateExecutionLog(
    log.id,
    ExecutionStatus.COMPLETED,
    message || `Action ${actionDetails.name} completed successfully`,
  );

  await queueNextStep(stepDetails, workflowDetails, jobId);
}

export const actionWorker = new Worker<ActionJobData>(
  queueName,
  async (job: Job<ActionJobData>) => {
    try {
      console.log('Action worker started for job:', job.id);
      const { stepId, jobId } = job.data;
      console.log(`Processing step ${stepId}`);

      const stepDetails = await db.query.steps.findFirst({
        where: eq(steps.id, stepId),
        with: {
          workflows: true,
          connections: true,
        },
      });

      if (!stepDetails?.workflows) {
        console.log(`Step ${stepId} or workflow not found`);
        return;
      }

      const app = apps.find((app) => app.id === stepDetails.app);
      const actionId = (stepDetails.metadata as any)?.data?.actionId;
      const actionDetails = app?.actions?.find(
        (action) => action.id === actionId,
      );

      const [executionLog] = await db
        .insert(executionLogs)
        .values({
          workflowId: stepDetails.workflows.id,
          stepId: stepId,
          jobId: jobId,
          message: `Action ${actionDetails?.name || actionId || 'unknown'} execution started`,
          status: ExecutionStatus.RUNNING,
        })
        .returning();

      if (!executionLog) {
        console.log(`Failed to create execution log for step ${stepId}`);
        return;
      }

      if (stepDetails.type !== StepType.ACTION) {
        console.log(`Step ${stepId} is not an action`);
        await updateExecutionLog(
          executionLog.id,
          ExecutionStatus.FAILED,
          `Step is not an action (type: ${stepDetails.type})`,
        );
        return;
      }

      const workflowDetails = stepDetails.workflows;

      const { fields } = (stepDetails.metadata as any).data;

      console.log(
        `Executing action ${actionId} for app ${stepDetails.app} in workflow ${workflowDetails.id}`,
      );

      if (!actionId) {
        console.log('Action ID not found in step metadata');
        await updateExecutionLog(
          executionLog.id,
          ExecutionStatus.FAILED,
          'Action ID not found in step metadata',
        );
        return;
      }

      if (!actionDetails) {
        console.log(`Action ${actionId} not found in app ${stepDetails.app}`);
        await updateExecutionLog(
          executionLog.id,
          ExecutionStatus.FAILED,
          `Action ${actionId} not found in app ${stepDetails.app}`,
        );
        return;
      }

      if (!app) {
        console.log(`App ${stepDetails.app} not found`);
        await updateExecutionLog(
          executionLog.id,
          ExecutionStatus.FAILED,
          `App ${stepDetails.app} not found`,
        );
        return;
      }

      let result = await actionDetails.run(
        fields,
        stepDetails.connections?.accessToken,
      );

      if (
        !result.success &&
        result.statusCode === 401 &&
        app.auth &&
        stepDetails.connectionId &&
        stepDetails.connections?.refreshToken
      ) {
        console.log(
          `Token expired for step ${stepId}, refreshing and retrying...`,
        );
        try {
          const { access_token } = await getRefreshTokenAndUpdate(
            stepDetails.connectionId,
            app,
          );

          if (access_token) {
            console.log(`Retrying action ${actionId} with refreshed token`);
            result = await actionDetails.run(fields, access_token);
          }
        } catch (refreshError) {
          console.error(
            `Failed to refresh token for step ${stepId}:`,
            refreshError,
          );
        }
      }

      if (!result.success) {
        console.log(
          `Action ${actionId} failed for step ${stepId}: ${result.message}`,
        );
        await updateExecutionLog(
          executionLog.id,
          ExecutionStatus.FAILED,
          result.message || `Action ${actionDetails.name} failed`,
        );
        return;
      }

      await handleSuccessfulAction(
        stepDetails,
        workflowDetails,
        actionDetails,
        executionLog,
        jobId,
        result.message,
      );
    } catch (error) {
      console.error('Action failed with error:', error);
      if (error instanceof Error) {
        console.error('Error details:', error.message, error.stack);
      }
      throw error;
    }
  },
  {
    connection: {
      url: config.REDIS_URL,
    },
    concurrency: 5,
  },
);

actionWorker.on('completed', (job) => {
  console.log(`Job ${job.id} completed successfully`);
});

actionWorker.on('failed', (job, err) => {
  console.error(`Job ${job?.id} failed:`, err.message);
});

actionWorker.on('error', (err) => {
  console.error('Worker error:', err);
});

console.log('Action Worker started');
