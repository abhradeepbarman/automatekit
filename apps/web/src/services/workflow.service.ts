import axiosInstance from '@/lib/axios';
import type { ExecutionStatus, StepType } from '@repo/common/types';
import type { SaveWorkflowSteps } from '@repo/common/validators';

export interface IWorkflow {
  id: string;
  name: string;
  isActive: boolean;
  lastExecutedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface IStep {
  id: string;
  type: StepType;
  index: number;
  integration: string;
  eventName: string;
  connectionId: string | null;
  config: Record<string, unknown>;
  position: { x: number; y: number };
  webhook: { method: string; url: string } | null;
}

export interface IEdge {
  source: string;
  target: string;
}

export interface IWorkflowDetails extends IWorkflow {
  steps: IStep[];
  edges: IEdge[];
}

export interface IGetAllWorkflowsResponse {
  workflows: IWorkflow[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface IExecutionStep {
  id: string;
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
  async createWorkflow(name?: string): Promise<IWorkflow> {
    const { data } = await axiosInstance.post('/workflow', { name });
    return data.data;
  }

  async getAllWorkflows(
    page = 1,
    limit = 10,
  ): Promise<IGetAllWorkflowsResponse> {
    const { data } = await axiosInstance.get('/workflow', {
      params: { page, limit },
    });
    return data.data;
  }

  async getWorkflow(workflowId: string): Promise<IWorkflowDetails> {
    const { data } = await axiosInstance.get(`/workflow/${workflowId}`);
    return data.data;
  }

  async updateWorkflow(workflowId: string, name?: string, isActive?: boolean) {
    const { data } = await axiosInstance.put(`/workflow/${workflowId}`, {
      name,
      isActive,
    });
    return data.data;
  }

  async deleteWorkflow(workflowId: string) {
    const { data } = await axiosInstance.delete(`/workflow/${workflowId}`);
    return data.data;
  }

  async saveSteps(
    workflowId: string,
    graph: SaveWorkflowSteps,
  ): Promise<IWorkflowDetails> {
    const { data } = await axiosInstance.put(
      `/workflow/${workflowId}/steps`,
      graph,
    );
    return data.data;
  }

  async runWorkflow(workflowId: string): Promise<{ executionId: string }> {
    const { data } = await axiosInstance.post(`/workflow/${workflowId}/run`);
    return data.data;
  }

  async getExecutions(
    workflowId: string,
    page = 1,
    limit = 20,
  ): Promise<IGetWorkflowExecutionsResponse> {
    const { data } = await axiosInstance.get(
      `/workflow/${workflowId}/executions`,
      { params: { page, limit } },
    );
    return data.data;
  }

  async getExecution(
    workflowId: string,
    executionId: string,
  ): Promise<IExecution> {
    const { data } = await axiosInstance.get(
      `/workflow/${workflowId}/executions/${executionId}`,
    );
    return data.data;
  }
}

const workflowService = new WorkflowService();
export default workflowService;
