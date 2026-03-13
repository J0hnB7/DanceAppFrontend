import axios, { type AxiosError, type AxiosRequestConfig } from "axios";

export interface ApiError {
  status: number;
  message: string;
  errors?: Record<string, string[]>;
}

const apiClient = axios.create({
  baseURL: "/api/v1",
  headers: { "Content-Type": "application/json" },
  withCredentials: true,
});

// Request interceptor — attach JWT access token
apiClient.interceptors.request.use((config) => {
  const token = getAccessToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor — handle 401 → refresh → retry once
let isRefreshing = false;
let failedQueue: { resolve: (v: unknown) => void; reject: (e: unknown) => void }[] = [];

function processQueue(error: unknown, token: string | null) {
  failedQueue.forEach((p) => (error ? p.reject(error) : p.resolve(token)));
  failedQueue = [];
}

apiClient.interceptors.response.use(
  (res) => res,
  async (error: AxiosError) => {
    const original = error.config as AxiosRequestConfig & { _retry?: boolean };
    if (error.response?.status === 401 && !original._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then((token) => {
          original.headers = { ...original.headers, Authorization: `Bearer ${token}` };
          return apiClient(original);
        });
      }
      original._retry = true;
      isRefreshing = true;
      try {
        const { data } = await axios.post<{ accessToken: string }>(
          "/api/v1/auth/refresh",
          {},
          { withCredentials: true }
        );
        setAccessToken(data.accessToken);
        processQueue(null, data.accessToken);
        original.headers = { ...original.headers, Authorization: `Bearer ${data.accessToken}` };
        return apiClient(original);
      } catch (refreshError) {
        processQueue(refreshError, null);
        clearAccessToken();
        // Redirect to login — dispatch custom event so auth store can react
        window.dispatchEvent(new CustomEvent("auth:logout"));
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }
    return Promise.reject(normalizeError(error));
  }
);

function normalizeError(error: AxiosError): ApiError {
  const data = error.response?.data as Record<string, unknown> | undefined;
  return {
    status: error.response?.status ?? 0,
    message:
      (data?.message as string) ??
      (data?.error as string) ??
      error.message ??
      "Unknown error",
    errors: data?.errors as Record<string, string[]> | undefined,
  };
}

// Simple in-memory token store (replaced by auth store on hydration)
let _accessToken: string | null = null;
export const getAccessToken = () => _accessToken;
export const setAccessToken = (t: string) => { _accessToken = t; };
export const clearAccessToken = () => { _accessToken = null; };

export default apiClient;
