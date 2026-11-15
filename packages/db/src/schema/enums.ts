import {
  AuthProvider,
  ExecutionStatus,
  HttpMethod,
  StepType,
} from '@repo/common/types';
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

export const httpMethodEnum = pgEnum('http_method', [
  HttpMethod.GET,
  HttpMethod.POST,
  HttpMethod.PUT,
  HttpMethod.PATCH,
  HttpMethod.DELETE,
]);
