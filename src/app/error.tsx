"use client";

import { useEffect } from "react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("App error:", error);
  }, [error]);

  return (
    <div style={{ fontFamily: "system-ui", padding: 24, maxWidth: 600, margin: "0 auto" }}>
      <h2 style={{ color: "#c00", fontSize: 18, marginBottom: 12 }}>Something went wrong</h2>
      <pre
        style={{
          background: "#f5f5f5",
          padding: 16,
          borderRadius: 8,
          overflowX: "auto",
          fontSize: 13,
          whiteSpace: "pre-wrap",
        }}
      >
        {error?.message}
        {"\n\n"}
        {error?.stack}
      </pre>
      <button
        onClick={reset}
        style={{ marginTop: 16, padding: "8px 16px", cursor: "pointer" }}
      >
        Try again
      </button>
    </div>
  );
}
