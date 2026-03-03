import axiosInstance from '@/lib/axios';

export interface ILoginResponse {
  id: string;
  name: string;
  email: string;
  access_token: string;
}

export interface IRegisterResponse {
  id: string;
  name: string;
  email: string;
  access_token: string;
}

class AuthService {
  async login(email: string, password: string): Promise<ILoginResponse> {
    const { data } = await axiosInstance.post('/auth/login', {
      email,
      password,
    });
    return data.data;
  }

  async register(
    name: string,
    email: string,
    password: string,
    confirmPassword: string,
  ): Promise<IRegisterResponse> {
    const { data } = await axiosInstance.post('/auth/register', {
      name,
      email,
      password,
      confirmPassword,
    });
    return data.data;
  }

  async logout(): Promise<void> {
    await axiosInstance.post('/auth/logout');
  }

  async forgotPassword(email: string): Promise<void> {
    await axiosInstance.post('/auth/forgot-password', { email });
  }

  async resetPassword(
    token: string,
    password: string,
    confirmPassword: string,
  ): Promise<void> {
    await axiosInstance.post(`/auth/reset-password/${token}`, {
      password,
      confirmPassword,
    });
  }
}

const authService = new AuthService();
export default authService;
