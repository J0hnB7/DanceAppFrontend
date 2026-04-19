import { describe, it, expect, vi, beforeEach } from "vitest";

// REGRESSION: sentry.edge.config.ts MUST exist — instrumentation.ts imports it.
// A missing/empty file causes middleware crash → 500 on all dynamic routes in prod.
// `logs: []` in Vercel runtime is the diagnostic signature.

const initSpy = vi.fn();

vi.mock("@sentry/nextjs", () => ({
  init: initSpy,
}));

describe("sentry.edge.config", () => {
  beforeEach(() => {
    initSpy.mockClear();
    vi.resetModules();
  });

  it("calls Sentry.init with a DSN config when loaded", async () => {
    process.env.NEXT_PUBLIC_SENTRY_DSN = "https://test@sentry.io/1";
    await import("../sentry.edge.config");

    expect(initSpy).toHaveBeenCalledTimes(1);
    const cfg = initSpy.mock.calls[0][0];
    expect(cfg).toHaveProperty("dsn");
    expect(cfg.dsn).toBe("https://test@sentry.io/1");
  });

  it("sets a tracesSampleRate", async () => {
    await import("../sentry.edge.config");
    const cfg = initSpy.mock.calls[0][0];
    expect(typeof cfg.tracesSampleRate).toBe("number");
    expect(cfg.tracesSampleRate).toBeGreaterThan(0);
  });
});
