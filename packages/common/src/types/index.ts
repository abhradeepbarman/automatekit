export interface ReturnResponse<T = any | null> {
  success: boolean;
  message: string;
  error?: string;
  statusCode: number;
  data?: T;
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

export type FieldConfig = {
  name: string;
  label: string;
  type:
    | 'text'
    | 'email'
    | 'number'
    | 'select'
    | 'textarea'
    | 'checkbox'
    | 'date';
  placeholder?: string;
  description?: string;
  disabled?: boolean;
  required?: boolean;
  options?: { label: string; value: string }[];
  validations?: () => any;
  defaultValue?: any;
};

export enum AppType {
  SYSTEM = 'system',
  GMAIL = 'gmail',
  NOTION = 'notion',
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

export type TDataAvailable = {
  [key: string]: {
    id: string;
    display: string;
  };
};

export interface ITrigger<T = any, TOutput = any> {
  id: string;
  name: string;
  description: string;
  fields?: FieldConfig[];
  dataAvailable?: TDataAvailable;
  run: (params: {
    metadata: T;
    lastExecutedAt?: Date | null;
    accessToken?: string;
  }) => Promise<ReturnResponse<TOutput>> | ReturnResponse<TOutput>;
}

export interface IAction<T = any, TOutput = any> {
  id: string;
  name: string;
  description: string;
  fields?: FieldConfig[];
  dataAvailable?: TDataAvailable;
  run: (params: {
    metadata: T;
    accessToken?: string;
  }) => Promise<ReturnResponse<TOutput>> | ReturnResponse<TOutput>;
}

export enum PollingInterval {
  ONE_MINUTE = '60000',
  FIVE_MINUTES = '300000',
  TEN_MINUTES = '600000',
}
