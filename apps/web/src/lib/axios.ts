import config from '@/config';
import axios from 'axios';

const axiosInstance = axios.create({
  baseURL: `${config.API_BASE_URL}/api/v1`,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
});

const refreshAccessToken = async () => {
  try {
    const response = await axios.post(
      `${config.API_BASE_URL}/api/v1/auth/refresh`,
      {},
      {
        withCredentials: true,
      },
    );
    const { data } = response.data;
    const { access_token } = data;
    const user = JSON.parse(localStorage.getItem('user') ?? '{');
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
