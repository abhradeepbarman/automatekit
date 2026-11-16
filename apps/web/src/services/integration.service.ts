import axiosInstance from '@/lib/axios';

export interface IntegrationEvent {
  id: string;
  name: string;
  description: string;
  icon?: string;
}

export interface Integration {
  id: string;
  name: string;
  description: string;
  icon?: string;
  hasAuth: boolean;
  triggers: IntegrationEvent[];
  actions: IntegrationEvent[];
}

class IntegrationService {
  async getIntegrations(): Promise<Integration[]> {
    const { data } = await axiosInstance.get('/integrations');
    return data.data;
  }
}

const integrationService = new IntegrationService();
export default integrationService;
