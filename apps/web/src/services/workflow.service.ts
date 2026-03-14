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
  app: string;
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

export interface IExecutionLog {
  id: string;
  workflowId: string;
  appId: string;
  stepId: string;
  stepType: StepType;
  jobId: string;
  message: string;
  status: ExecutionStatus;
  createdAt: string;
  updatedAt: string;
}

export interface IGetWorkflowExecutionLogsResponse {
  executionLogs: IExecutionLog[];
  pagination: {
    page: number;
    limit: number;
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

  async getExecutionLogs(
    workflowId: string,
    limit: number = 20,
    offset: number = 1,
  ): Promise<IGetWorkflowExecutionLogsResponse> {
    const { data } = await axiosInstance.get(`/workflow/${workflowId}/logs`, {
      params: { limit, offset },
    });
    return data.data;
  }
}

const workflowService = new WorkflowService();
export default workflowService;
