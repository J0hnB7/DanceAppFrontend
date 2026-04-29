import axios, { type AxiosError, type AxiosRequestConfig } from "axios";

export interface ApiError {
  status: number;
  message: string;
  errors?: Record<string, string[]>;
}

const apiClient = axios.create({
  baseURL: "/api/v1",
  headers: {
    "Content-Type": "application/json",
    // Defence-in-depth against CSRF (MED-16). Browsers refuse to send custom
    // headers on simple cross-origin form submits without a CORS preflight,
    // so a forged form on evil.com cannot include this header → any state-
    // changing request without it can be treated as suspect by the BE. We
    // already have SameSite=Strict on the refresh cookie (MED-6) and Bearer-
    // token auth on every other endpoint; this header is the third layer.
    "X-Requested-With": "XMLHttpRequest",
  },
  withCredentials: true,
  timeout: 15000, // 15 s — prevents infinite hang when backend is down
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
// Single shared Promise used as a mutex: all concurrent 401s await the same refresh,
// eliminating the race window that existed with the old isRefreshing flag approach.
let refreshPromise: Promise<string> | null = null;

apiClient.interceptors.response.use(
  (res) => res,
  async (error: AxiosError) => {
    const original = error.config as AxiosRequestConfig & { _retry?: boolean };
    const isAuthEndpoint = original.url?.includes("/auth/login") || original.url?.includes("/auth/refresh") || original.url?.includes("/auth/logout");
    if (error.response?.status === 401 && !original._retry && !isAuthEndpoint) {
      original._retry = true;
      if (!refreshPromise) {
        refreshPromise = axios
          .post<{ accessToken: string }>("/api/v1/auth/refresh", {}, { withCredentials: true })
          .then(({ data }) => {
            setAccessToken(data.accessToken);
            return data.accessToken;
          })
          .catch((refreshError) => {
            clearAccessToken();
            window.dispatchEvent(new CustomEvent("auth:logout"));
            throw refreshError;
          })
          .finally(() => {
            refreshPromise = null;
          });
      }
      return refreshPromise.then((token) => {
        original.headers = { ...original.headers, Authorization: `Bearer ${token}` };
        return apiClient(original);
      });
    }
    return Promise.reject(normalizeError(error));
  }
);

function normalizeError(error: AxiosError): ApiError {
  const data = error.response?.data as Record<string, unknown> | undefined;
  return {
    status: error.response?.status ?? 0,
    // Spring ProblemDetail uses "detail"; fallback to "message"/"error" for other formats
    message:
      (data?.detail as string) ??
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
