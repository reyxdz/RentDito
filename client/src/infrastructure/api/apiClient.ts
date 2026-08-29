import axios, { AxiosError } from 'axios';
import type { InternalAxiosRequestConfig } from 'axios';

// Get base URL from environment or fallback
export const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

export const getImageUrl = (url: string | undefined): string | undefined => {
  if (!url) return undefined;
  if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:')) return url;
  if (url.startsWith('/uploads/')) return `${BASE_URL}${url}`;
  return url;
};

export const apiClient = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export interface ApiError {
  message: string;
  statusCode: number;
  errors?: Record<string, string[]>;
}

// Interceptor for attaching auth token
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Define a queue for refresh token requests
let isRefreshing = false;
let failedQueue: { resolve: (value?: unknown) => void; reject: (reason?: any) => void }[] = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach(prom => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });

  failedQueue = [];
};

// Interceptor for error handling and token refresh
apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as any;

    const isAuthRoute =
      originalRequest.url?.includes('/api/auth/login') ||
      originalRequest.url?.includes('/api/auth/register') ||
      originalRequest.url?.includes('/api/auth/refresh');

    if (error.response?.status === 401 && !originalRequest._retry && !isAuthRoute) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers['Authorization'] = `Bearer ${token}`;
            return apiClient(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const refreshToken = localStorage.getItem('refreshToken');
        if (!refreshToken) {
          throw new Error('No refresh token available');
        }

        // Must use basic axios to avoid interceptor loop
        const { data } = await axios.post(`${BASE_URL}/api/auth/refresh`, {
          refreshToken,
        });

        const newAccessToken = data?.data?.accessToken;
        const newRefreshToken = data?.data?.refreshToken;

        if (!newAccessToken) {
          throw new Error('Refresh endpoint did not return an access token');
        }

        localStorage.setItem('accessToken', newAccessToken);
        if (newRefreshToken) {
          localStorage.setItem('refreshToken', newRefreshToken);
        }

        apiClient.defaults.headers.common['Authorization'] = `Bearer ${newAccessToken}`;
        originalRequest.headers['Authorization'] = `Bearer ${newAccessToken}`;

        processQueue(null, newAccessToken);
        return apiClient(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        
        // Clear tokens and redirect to login if refresh fails
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        window.location.href = '/login';
        
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    // Error normalization
    const customError: ApiError = {
      message: 'An unexpected error occurred',
      statusCode: error.response?.status || 500,
    };

    if (error.response && error.response.data) {
      const data = error.response.data as any;
      if (data.message) {
        customError.message = data.message;
      }
      if (data.errors) {
        customError.errors = data.errors;
      }
    } else if (error.message) {
      customError.message = error.message;
    }

    return Promise.reject(customError);
  }
);
