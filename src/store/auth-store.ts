import { create } from "zustand";
import { persist } from "zustand/middleware";
import { authApi, type UserDto } from "@/lib/api/auth";
import { setAccessToken, clearAccessToken } from "@/lib/api-client";

interface AuthState {
  user: UserDto | null;
  isAuthenticated: boolean;
  isLoading: boolean;

  setUser: (user: UserDto, accessToken: string) => void;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      isAuthenticated: false,
      isLoading: false,

      setUser: (user, accessToken) => {
        setAccessToken(accessToken);
        set({ user, isAuthenticated: true });
      },

      logout: async () => {
        try {
          await authApi.logout();
        } catch {
          // ignore — still clear local state
        }
        clearAccessToken();
        set({ user: null, isAuthenticated: false });
      },

      checkAuth: async () => {
        set({ isLoading: true });
        try {
          const user = await authApi.me();
          set({ user, isAuthenticated: true });
        } catch {
          clearAccessToken();
          set({ user: null, isAuthenticated: false });
        } finally {
          set({ isLoading: false });
        }
      },
    }),
    {
      name: "auth",
      // Only persist user identity — access token lives in memory only
      partialize: (state) => ({ user: state.user, isAuthenticated: state.isAuthenticated }),
    }
  )
);

// Listen for global logout event (triggered by 401 interceptor)
if (typeof window !== "undefined") {
  window.addEventListener("auth:logout", () => {
    useAuthStore.getState().logout();
  });
}
