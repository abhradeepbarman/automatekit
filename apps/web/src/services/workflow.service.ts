import axiosInstance from '@/lib/axios';
import type { ExecutionStatus, StepType } from '@repo/common/types';
import type { Node } from '@xyflow/react';

export interface ICreateWorkflowResponse {
  id: string;
  name: string;
  userId: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface IStep {
  id: string;
  type: string;
  integration: string;
  connectionId: string;
  workflowId: string;
  lastExecutedAt: string;
  eventName: string;
  metadata: Node;
  createdAt: string;
  updatedAt: string;
}

export interface IGetWorkflowResponse {
  id: string;
  name: string;
  userId: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  steps: IStep[];
}

export interface IGetAllWorkflowsResponse {
  workflows: Array<{
    id: string;
    name: string;
    userId: string;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
    lastExecutedAt: string | null;
  }>;
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface IExecutionStep {
  id: string;
  executionId: string;
  stepId: string | null;
  stepIndex: number;
  stepType: StepType;
  integration: string;
  eventName: string;
  status: ExecutionStatus;
  input: unknown;
  output: unknown;
  message: string | null;
  startedAt: string;
  finishedAt: string | null;
}

export interface IExecution {
  id: string;
  workflowId: string;
  status: ExecutionStatus;
  triggerData: unknown;
  error: string | null;
  startedAt: string;
  finishedAt: string | null;
  steps: IExecutionStep[];
}

export interface IGetWorkflowExecutionsResponse {
  executions: IExecution[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    hasMore: boolean;
  };
}

class WorkflowService {
  async createWorkflow(name?: string): Promise<ICreateWorkflowResponse> {
    const { data } = await axiosInstance.post('/workflow', {
      name,
    });

    return data.data;
  }

  async deleteWorkflow(workflowId: string) {
    const { data } = await axiosInstance.delete(`/workflow/${workflowId}`);
    return data.data;
  }

  async getWorkflow(workflowId: string): Promise<IGetWorkflowResponse> {
    const { data } = await axiosInstance.get(`/workflow/${workflowId}`);
    return data.data;
  }

  async getAllWorkflows(
    page: number = 1,
    limit: number = 10,
  ): Promise<IGetAllWorkflowsResponse> {
    const { data } = await axiosInstance.get('/workflow', {
      params: { page, limit },
    });
    return data.data;
  }

  async updateWorkflow(workflowId: string, name?: string, isActive?: boolean) {
    const { data } = await axiosInstance.put(`/workflow/${workflowId}`, {
      name,
      isActive,
    });
    return data.data;
  }

  async getExecutions(
    workflowId: string,
    page: number = 1,
    limit: number = 20,
  ): Promise<IGetWorkflowExecutionsResponse> {
    const { data } = await axiosInstance.get(
      `/workflow/${workflowId}/executions`,
      { params: { page, limit } },
    );
    return data.data;
  }
}

const workflowService = new WorkflowService();
export default workflowService;
