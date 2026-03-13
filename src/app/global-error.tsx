"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html>
      <body style={{ fontFamily: "system-ui", padding: 24 }}>
        <h1 style={{ color: "#c00", fontSize: 18 }}>Application error</h1>
        <pre
          style={{
            background: "#f5f5f5",
            padding: 16,
            borderRadius: 8,
            overflowX: "auto",
            fontSize: 13,
          }}
        >
          {error?.message ?? "Unknown error"}
          {"\n\n"}
          {error?.stack}
        </pre>
        <button onClick={reset} style={{ marginTop: 16, padding: "8px 16px" }}>
          Try again
        </button>
      </body>
    </html>
  );
}
