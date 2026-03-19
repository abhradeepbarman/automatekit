export interface ReturnResponse<T = any | null> {
  success: boolean;
  message: string;
  error?: Error;
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

export type FieldTypeMap = {
  string: string;
  number: number;
  boolean: boolean;
  date: Date;
  object: Record<string, any>;
};

export interface IDataField<
  K extends string = string,
  T extends keyof FieldTypeMap = keyof FieldTypeMap,
> {
  key: K;
  label: string;
  type: T;
}

export type SchemaToData<T extends readonly IDataField[]> = {
  [K in T[number] as K['key']]: FieldTypeMap[K['type']];
};

export interface ITrigger<
  TMeta = any,
  TSchema extends readonly IDataField[] = readonly IDataField[],
> {
  id: string;
  name: string;
  description: string;
  fields?: FieldConfig[];
  dataAvailable?: TSchema;
  run: (params: {
    metadata: TMeta;
    lastExecutedAt: Date;
    accessToken?: string;
  }) =>
    | Promise<ReturnResponse<SchemaToData<TSchema>>>
    | ReturnResponse<SchemaToData<TSchema>>;
}

export interface IAction<
  TMeta = any,
  TSchema extends readonly IDataField[] = readonly IDataField[],
> {
  id: string;
  name: string;
  description: string;
  fields?: FieldConfig[];
  dataAvailable?: TSchema;
  run: (params: {
    metadata: TMeta;
    accessToken?: string;
  }) => Promise<
    | ReturnResponse<SchemaToData<TSchema>>
    | ReturnResponse<SchemaToData<TSchema>>
  >;
}

export enum PollingInterval {
  ONE_MINUTE = '60000',
  FIVE_MINUTES = '300000',
  TEN_MINUTES = '600000',
}
