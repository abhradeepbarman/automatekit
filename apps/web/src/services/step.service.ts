import axiosInstance from '@/lib/axios';
import type { StepType } from '@repo/common/types';
import type { IStep } from './workflow.service';

class StepService {
  async addStep(
    workflowId: string,
    app: string,
    eventName: string,
    index: number,
    type: StepType,
    connectionId: string,
    metadata: any,
  ): Promise<IStep> {
    const { data } = await axiosInstance.post(`/step/workflow/${workflowId}`, {
      app,
      index,
      type,
      connectionId,
      eventName,
      metadata,
    });

    return data.data;
  }

  async getStep(stepId: string) {
    const { data } = await axiosInstance.get(`/step/${stepId}`);
    return data.data;
  }

  async deleteStep(stepId: string) {
    const { data } = await axiosInstance.delete(`/step/${stepId}`);
    return data.data;
  }

  async updateStep(
    stepId: string,
    app?: string,
    connectionId?: string,
    metadata?: any,
  ) {
    const { data } = await axiosInstance.put(`/step/${stepId}`, {
      app,
      connectionId,
      metadata,
    });

    return data.data;
  }
}

const stepService = new StepService();
export default stepService;
