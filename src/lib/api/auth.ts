import apiClient from "@/lib/api-client";

export interface LoginRequest {
  email: string;
  password: string;
  totpCode?: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
}

export interface AuthResponse {
  accessToken: string;
  user: UserDto;
}

export interface UserDto {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: "ORGANIZER" | "ADMIN" | "JUDGE" | "DANCER";
  emailVerified: boolean;
  twoFactorEnabled: boolean;
}

export interface RefreshResponse {
  accessToken: string;
}

export const authApi = {
  login: (data: LoginRequest) =>
    apiClient.post<AuthResponse>("/auth/login", data).then((r) => r.data),

  register: (data: RegisterRequest) =>
    apiClient.post<AuthResponse>("/auth/register", data).then((r) => r.data),

  logout: () => apiClient.post("/auth/logout").then((r) => r.data),

  me: () => apiClient.get<UserDto>("/auth/me").then((r) => r.data),

  verifyEmail: (token: string) =>
    apiClient.post("/auth/verify-email", { token }).then((r) => r.data),

  resendVerification: (email: string) =>
    apiClient.post("/auth/resend-verification", { email }).then((r) => r.data),

  forgotPassword: (email: string) =>
    apiClient.post("/auth/forgot-password", { email }).then((r) => r.data),

  resetPassword: (token: string, password: string) =>
    apiClient.post("/auth/reset-password", { token, password }).then((r) => r.data),

  setupTotp: () =>
    apiClient.post<{ secret: string; qrCode: string }>("/auth/2fa/setup").then((r) => r.data),

  confirmTotp: (code: string) =>
    apiClient.post("/auth/2fa/confirm", { code }).then((r) => r.data),

  disableTotp: (code: string) =>
    apiClient.post("/auth/2fa/disable", { code }).then((r) => r.data),
};
