import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/api/auth", () => ({
  authApi: {
    me: vi.fn(),
    logout: vi.fn(),
  },
}));

vi.mock("@/lib/api-client", () => ({
  setAccessToken: vi.fn(),
  clearAccessToken: vi.fn(),
}));

import { authApi } from "@/lib/api/auth";
import { setAccessToken, clearAccessToken } from "@/lib/api-client";
import { useAuthStore } from "./auth-store";

const setAccessTokenMock = vi.mocked(setAccessToken);
const clearAccessTokenMock = vi.mocked(clearAccessToken);
const meMock = vi.mocked(authApi.me);
const logoutMock = vi.mocked(authApi.logout);

const makeUser = (overrides: Partial<{ locale: "cs" | "en" }> = {}) => ({
  id: "u1",
  email: "jan@example.com",
  name: "Jan",
  role: "DANCER" as const,
  emailVerified: true,
  locale: "cs" as const,
  ...overrides,
});

describe("auth-store", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuthStore.setState({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      _hasHydrated: false,
    });
  });

  describe("loginWithTokens", () => {
    it("sets access token and authenticates when me() resolves", async () => {
      const user = makeUser();
      meMock.mockResolvedValueOnce(user);

      await useAuthStore.getState().loginWithTokens("access-token-1");

      expect(setAccessTokenMock).toHaveBeenCalledWith("access-token-1");
      expect(useAuthStore.getState().user).toEqual(user);
      expect(useAuthStore.getState().isAuthenticated).toBe(true);
    });

    it("leaves isAuthenticated false when me() throws (half-set state guard)", async () => {
      meMock.mockRejectedValueOnce(new Error("401"));

      await expect(
        useAuthStore.getState().loginWithTokens("bad-token")
      ).rejects.toThrow("401");

      expect(setAccessTokenMock).toHaveBeenCalledWith("bad-token");
      expect(useAuthStore.getState().isAuthenticated).toBe(false);
      expect(useAuthStore.getState().user).toBeNull();
    });
  });

  describe("logout", () => {
    it("clears token and resets user/isAuthenticated", async () => {
      useAuthStore.setState({ user: makeUser(), isAuthenticated: true });
      logoutMock.mockResolvedValueOnce(undefined);

      await useAuthStore.getState().logout();

      expect(clearAccessTokenMock).toHaveBeenCalled();
      expect(useAuthStore.getState().user).toBeNull();
      expect(useAuthStore.getState().isAuthenticated).toBe(false);
    });

    it("still clears local state when authApi.logout() throws", async () => {
      useAuthStore.setState({ user: makeUser(), isAuthenticated: true });
      logoutMock.mockRejectedValueOnce(new Error("network"));

      await useAuthStore.getState().logout();

      expect(clearAccessTokenMock).toHaveBeenCalled();
      expect(useAuthStore.getState().isAuthenticated).toBe(false);
    });
  });

  describe("checkAuth", () => {
    it("sets authenticated user when me() resolves", async () => {
      const user = makeUser();
      meMock.mockResolvedValueOnce(user);

      await useAuthStore.getState().checkAuth();

      expect(useAuthStore.getState().user).toEqual(user);
      expect(useAuthStore.getState().isAuthenticated).toBe(true);
      expect(useAuthStore.getState().isLoading).toBe(false);
    });

    it("clears token and session when me() rejects", async () => {
      meMock.mockRejectedValueOnce(new Error("401"));

      await useAuthStore.getState().checkAuth();

      expect(clearAccessTokenMock).toHaveBeenCalled();
      expect(useAuthStore.getState().isAuthenticated).toBe(false);
      expect(useAuthStore.getState().user).toBeNull();
      expect(useAuthStore.getState().isLoading).toBe(false);
    });
  });

  describe("setLocale", () => {
    it("updates locale without overwriting other user fields", () => {
      const user = makeUser({ locale: "cs" });
      useAuthStore.setState({ user, isAuthenticated: true });

      useAuthStore.getState().setLocale("en");

      const updated = useAuthStore.getState().user;
      expect(updated).toEqual({ ...user, locale: "en" });
    });

    it("is a no-op when user is null", () => {
      useAuthStore.getState().setLocale("en");
      expect(useAuthStore.getState().user).toBeNull();
    });
  });
});
