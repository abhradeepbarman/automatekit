import type { z } from 'zod';

export interface ReturnResponse<T = any | null> {
  success: boolean;
  message: string;
  error?: Error;
  statusCode: number;
  data?: T;
  /** Polling triggers set this for "nothing to do this tick" — a no-op, not a failure. */
  skipped?: boolean;
}

export enum HttpMethod {
  GET = 'GET',
  POST = 'POST',
  PUT = 'PUT',
  PATCH = 'PATCH',
  DELETE = 'DELETE',
}

export enum ExecutionStatus {
  PENDING = 'PENDING',
  RUNNING = 'RUNNING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
}

export enum ConditionOperator {
  EQUAL = 'EQUAL',
  NOT_EQUAL = 'NOT_EQUAL',
  CONTAINS = 'CONTAINS',
}

export enum StepType {
  TRIGGER = 'TRIGGER',
  ACTION = 'ACTION',
}

export enum AuthProvider {
  LOCAL = 'local',
  GOOGLE = 'google',
}

export enum AppType {
  SYSTEM = 'system',
  GMAIL = 'gmail',
  DISCORD = 'discord',
  NOTION = 'notion',
}

/** Built-in events of the `system` app, referenced across FE and BE. */
export enum SystemEvent {
  TIMER = 'timer',
  WEBHOOK = 'webhook',
  TAP = 'tap',
}

export interface ConnectionCredentials {
  accessToken?: string;
  refreshToken?: string;
  apiKey?: string;
  [key: string]: unknown;
}

export interface TokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
}

export interface IApp {
  id: AppType;
  name: string;
  description: string;
  icon?: string;
  triggers?: ITrigger[];
  actions?: IAction[];
  auth?: {
    getAuthUrl: () => string;
    getToken: (code: string) => Promise<TokenResponse>;
    getUserInfo: (accessToken: string) => Promise<any>;
    refreshAccessToken: (refreshToken: string) => Promise<TokenResponse>;
  };
}

export interface ITrigger<TMeta = any> {
  id: string;
  name: string;
  description: string;
  icon?: string;
  schema?: z.ZodType;
  run: (params: {
    metadata: TMeta;
    lastExecutedAt: Date | null;
    accessToken?: string;
  }) => Promise<ReturnResponse> | ReturnResponse;
}

export interface IAction<TMeta = any> {
  id: string;
  name: string;
  description: string;
  icon?: string;
  schema?: z.ZodType;
  run: (params: {
    metadata: TMeta;
    accessToken?: string;
  }) => Promise<ReturnResponse>;
}

export enum PollingInterval {
  ONE_MINUTE = '60000',
  FIVE_MINUTES = '300000',
  TEN_MINUTES = '600000',
}
