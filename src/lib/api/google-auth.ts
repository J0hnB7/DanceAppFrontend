import apiClient from "@/lib/api-client";

export interface GoogleAuthResponse {
  accessToken: string;
  requiresOnboarding: boolean;
}

export const googleAuthApi = {
  signIn: (idToken: string) =>
    apiClient
      .post<GoogleAuthResponse>("/auth/google", { idToken })
      .then((r) => r.data),
};
