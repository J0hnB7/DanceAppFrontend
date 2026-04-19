import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import MockAdapter from "axios-mock-adapter";
import axios from "axios";

import apiClient, { setAccessToken, clearAccessToken } from "./api-client";

describe("api-client", () => {
  let clientMock: MockAdapter;
  let globalAxiosMock: MockAdapter;
  let dispatchSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    clientMock = new MockAdapter(apiClient);
    globalAxiosMock = new MockAdapter(axios);
    dispatchSpy = vi.spyOn(window, "dispatchEvent");
    clearAccessToken();
  });

  afterEach(() => {
    clientMock.restore();
    globalAxiosMock.restore();
    dispatchSpy.mockRestore();
    clearAccessToken();
  });

  describe("401 → refresh → retry", () => {
    it("refreshes token on 401 and retries original request", async () => {
      setAccessToken("stale");
      clientMock.onGet("/me").replyOnce(401).onGet("/me").replyOnce(200, { ok: true });
      globalAxiosMock.onPost("/api/v1/auth/refresh").replyOnce(200, { accessToken: "fresh" });

      const res = await apiClient.get("/me");

      expect(res.data).toEqual({ ok: true });
      expect(globalAxiosMock.history.post).toHaveLength(1);
    });

    it("calls /auth/refresh exactly once for concurrent 401s (mutex)", async () => {
      setAccessToken("stale");
      clientMock
        .onGet("/a").replyOnce(401).onGet("/a").replyOnce(200, { a: 1 })
        .onGet("/b").replyOnce(401).onGet("/b").replyOnce(200, { b: 2 });
      globalAxiosMock.onPost("/api/v1/auth/refresh").replyOnce(200, { accessToken: "fresh" });

      const [a, b] = await Promise.all([apiClient.get("/a"), apiClient.get("/b")]);

      expect(a.data).toEqual({ a: 1 });
      expect(b.data).toEqual({ b: 2 });
      expect(globalAxiosMock.history.post.filter((r) => r.url?.includes("/auth/refresh"))).toHaveLength(1);
    });

    it("clears token and dispatches auth:logout when refresh itself fails", async () => {
      setAccessToken("stale");
      clientMock.onGet("/me").replyOnce(401);
      globalAxiosMock.onPost("/api/v1/auth/refresh").replyOnce(401);

      await expect(apiClient.get("/me")).rejects.toMatchObject({ status: 401 });

      const events = dispatchSpy.mock.calls.map(([e]) => (e as CustomEvent).type);
      expect(events).toContain("auth:logout");
    });

    it("does not retry or refresh on non-401 errors", async () => {
      setAccessToken("valid");
      clientMock.onGet("/forbidden").replyOnce(403, { detail: "nope" });

      await expect(apiClient.get("/forbidden")).rejects.toMatchObject({ status: 403, message: "nope" });
      expect(globalAxiosMock.history.post).toHaveLength(0);
    });
  });

  describe("normalizeError", () => {
    it("maps Spring ProblemDetail.detail → message", async () => {
      clientMock.onGet("/x").replyOnce(400, { detail: "bad input" });
      await expect(apiClient.get("/x")).rejects.toMatchObject({ message: "bad input", status: 400 });
    });

    it("falls back to message then error field", async () => {
      clientMock.onGet("/x").replyOnce(500, { message: "server err" });
      await expect(apiClient.get("/x")).rejects.toMatchObject({ message: "server err" });

      clientMock.onGet("/y").replyOnce(500, { error: "err field" });
      await expect(apiClient.get("/y")).rejects.toMatchObject({ message: "err field" });
    });
  });
});
