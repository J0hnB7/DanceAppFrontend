import { describe, it, expect, vi, beforeEach } from "vitest";

// REGRESSION: NEXT_PUBLIC_API_URL trailing newline (\n) corrupts rewrites() destination.
// `${process.env.NEXT_PUBLIC_API_URL}/api/:path*` → "https://backend.app\n/api/:path*"
// Result: serverless crash, 500 on all dynamic ƒ routes.
// Defensive fix: destination must be sanitized via .trim().

vi.mock("@sentry/nextjs", () => ({
  withSentryConfig: (config: unknown) => config,
}));

describe("next.config rewrites — NEXT_PUBLIC_API_URL sanitization", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("trims trailing whitespace/newlines from NEXT_PUBLIC_API_URL in rewrites destination", async () => {
    process.env.NEXT_PUBLIC_API_URL = "https://backend.example.app\n";
    const mod = await import("../next.config");
    const config: { rewrites: () => Promise<Array<{ source: string; destination: string }>> } =
      mod.default as never;
    const rewrites = await config.rewrites();

    expect(rewrites).toHaveLength(1);
    const dest = rewrites[0].destination;
    // No whitespace/newlines anywhere in the URL
    expect(dest).not.toMatch(/\s/);
    expect(dest).toBe("https://backend.example.app/api/:path*");
  });

  it("handles unset NEXT_PUBLIC_API_URL without producing 'undefined' literal", async () => {
    delete process.env.NEXT_PUBLIC_API_URL;
    const mod = await import("../next.config");
    const config: { rewrites: () => Promise<Array<{ source: string; destination: string }>> } =
      mod.default as never;
    const rewrites = await config.rewrites();
    const dest = rewrites[0].destination;
    // Must NOT produce the literal "undefined/api/..." (which Vercel rejects with Invalid rewrite)
    expect(dest).not.toContain("undefined");
  });
});
