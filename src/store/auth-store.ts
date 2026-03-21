import { create } from "zustand";
import { persist } from "zustand/middleware";
import { authApi, type UserDto } from "@/lib/api/auth";
import { setAccessToken, clearAccessToken } from "@/lib/api-client";
import type { Locale } from "@/lib/i18n/translations";

interface AuthState {
  user: UserDto | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  _hasHydrated: boolean;

  setUser: (user: UserDto, accessToken: string) => void;
  loginWithTokens: (accessToken: string) => Promise<void>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
  setLocale: (locale: Locale) => void;
  _setHasHydrated: (v: boolean) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      _hasHydrated: false,

      _setHasHydrated: (v) => set({ _hasHydrated: v }),

      setUser: (user, accessToken) => {
        setAccessToken(accessToken);
        set({ user, isAuthenticated: true });
      },

      loginWithTokens: async (accessToken) => {
        setAccessToken(accessToken);
        const user = await authApi.me();
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

      setLocale: (locale) => {
        set((state) => state.user ? { user: { ...state.user, locale } } : {});
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
      onRehydrateStorage: () => (state) => {
        state?._setHasHydrated(true);
      },
    }
  )
);

// Listen for global logout event (triggered by 401 interceptor).
// Module-level flag ensures the listener is registered only once,
// even when HMR hot-reloads this module multiple times.
function handleAuthLogout() {
  useAuthStore.getState().logout();
}
let _authLogoutListenerRegistered = false;
if (typeof window !== "undefined" && !_authLogoutListenerRegistered) {
  _authLogoutListenerRegistered = true;
  window.addEventListener("auth:logout", handleAuthLogout);
}

/** Returns the current user's locale, defaulting to "cs". */
export const useLocale = () => useAuthStore((s) => (s.user?.locale ?? "cs") as import("@/lib/i18n/translations").Locale);
