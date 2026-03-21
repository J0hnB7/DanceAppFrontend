import apiClient from "@/lib/api-client";

export interface LoginRequest {
  email: string;
  password: string;
  totpCode?: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  name: string;
  organizationName?: string;
  gdprAccepted: boolean;
}

/** Backend returns only tokens — call /auth/me separately to get user profile */
export interface TokenResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface UserDto {
  id: string;
  email: string;
  name: string;
  organizationName?: string;
  role: "ORGANIZER" | "ADMIN" | "JUDGE" | "DANCER";
  emailVerified: boolean;
  twoFactorEnabled?: boolean;
  locale: "cs" | "en";
}

export interface RefreshResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export const authApi = {
  login: (data: LoginRequest) =>
    apiClient.post<TokenResponse>("/auth/login", data).then((r) => r.data),

  register: (data: RegisterRequest) =>
    apiClient.post<TokenResponse>("/auth/register", data).then((r) => r.data),

  logout: () => apiClient.post("/auth/logout").then((r) => r.data),

  me: () => apiClient.get<UserDto>("/auth/me").then((r) => r.data),

  updateProfile: (data: { name?: string; organizationName?: string; locale?: string }) =>
    apiClient.put<UserDto>("/auth/me", data).then((r) => r.data),

  changePassword: (data: { currentPassword: string; newPassword: string }) =>
    apiClient.put("/auth/password", data).then((r) => r.data),

  verifyEmail: (token: string) =>
    apiClient.post("/auth/verify-email", { token }).then((r) => r.data),

  resendVerification: (email: string) =>
    apiClient.post("/auth/resend-verification", { email }).then((r) => r.data),

  forgotPassword: (email: string) =>
    apiClient.post("/auth/forgot-password", { email }).then((r) => r.data),

  resetPassword: (token: string, password: string) =>
    apiClient.post("/auth/reset-password", { token, password }).then((r) => r.data),

  setupTotp: () =>
    apiClient.post<{ secret: string; qrCode: string; qrCodeBase64: string; backupCodes: string[] }>("/auth/2fa/setup").then((r) => r.data),

  confirmTotp: (code: string) =>
    apiClient.post("/auth/2fa/verify", { code }).then((r) => r.data),

  disableTotp: (code: string) =>
    apiClient.delete("/auth/2fa", { data: { code } }).then((r) => r.data),
};
