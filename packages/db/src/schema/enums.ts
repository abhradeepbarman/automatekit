import { AuthProvider, ExecutionStatus, StepType } from '@repo/common/types';
import { pgEnum } from 'drizzle-orm/pg-core';

export const authProviderEnum = pgEnum('auth_provider', [
  AuthProvider.LOCAL,
  AuthProvider.GOOGLE,
]);

export const stepTypeEnum = pgEnum('step_type', [
  StepType.TRIGGER,
  StepType.ACTION,
]);

export const executionStatusEnum = pgEnum('execution_status', [
  ExecutionStatus.PENDING,
  ExecutionStatus.RUNNING,
  ExecutionStatus.COMPLETED,
  ExecutionStatus.FAILED,
]);
