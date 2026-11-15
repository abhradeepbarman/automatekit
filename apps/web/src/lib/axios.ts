import config from '@/config/env';
import axios from 'axios';

const axiosInstance = axios.create({
  baseURL: `${config.API_BASE_URL}/api/v1`,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
});

const readStoredUser = (): Record<string, unknown> => {
  try {
    return JSON.parse(localStorage.getItem('user') ?? '{}') ?? {};
  } catch {
    return {};
  }
};

let refreshPromise: Promise<string | null> | null = null;

const performRefresh = async (): Promise<string | null> => {
  try {
    const response = await axios.post(
      `${config.API_BASE_URL}/api/v1/auth/refresh`,
      {},
      {
        withCredentials: true,
      },
    );
    const { access_token } = response.data.data;

    const user = readStoredUser();
    user.access_token = access_token;
    localStorage.setItem('user', JSON.stringify(user));

    return access_token;
  } catch (error) {
    console.error('Failed to refresh token:', error);
    localStorage.removeItem('user');
    window.location.href = '/login';
    return null;
  }
};

const refreshAccessToken = (): Promise<string | null> => {
  if (!refreshPromise) {
    refreshPromise = performRefresh().finally(() => {
      refreshPromise = null;
    });
  }
  return refreshPromise;
};

axiosInstance.interceptors.request.use(
  (config) => {
    const { access_token } = JSON.parse(localStorage.getItem('user') ?? '{}');
    if (access_token) {
      config.headers.Authorization = `Bearer ${access_token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  },
);

axiosInstance.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error?.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      const newAccessToken = await refreshAccessToken();

      if (newAccessToken) {
        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
        return axiosInstance(originalRequest);
      }
    }

    return Promise.reject(error);
  },
);

export default axiosInstance;
