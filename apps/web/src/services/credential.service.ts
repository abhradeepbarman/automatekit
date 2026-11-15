import axiosInstance from '@/lib/axios';

interface IGetAuthUrlResponse {
  authUrl: string;
}

interface IGetTokenResponse {
  id: string;
  integration: string;
  name: string;
}

class CredentialService {
  async getAuthUrl(provider: string): Promise<IGetAuthUrlResponse> {
    const { data } = await axiosInstance.get(`/credential/${provider}`);

    return data.data;
  }

  async getConnections(provider: string, stepType: string) {
    const { data } = await axiosInstance.get(
      `/credential/${provider}/connections?stepType=${stepType}`,
    );

    return data.data;
  }

  async getToken(
    provider: string,
    code: string,
    stepType: string,
  ): Promise<IGetTokenResponse> {
    const { data } = await axiosInstance.post(`/credential/${provider}/token`, {
      code,
      stepType,
    });

    return data.data;
  }
}

const credentialService = new CredentialService();
export default credentialService;
