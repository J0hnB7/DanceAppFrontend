"use client";

// Synchronously set up mock interceptors before any React renders / effects fire.
// Using require() ensures this is synchronous — no race condition with useEffect API calls.
if (typeof window !== "undefined" && process.env.NEXT_PUBLIC_MOCK_API === "true") {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { setupMockApi } = require("@/mocks/setup") as typeof import("@/mocks/setup");
  setupMockApi();
}

export function MockProvider({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
