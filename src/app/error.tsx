"use client";

import { useEffect } from "react";

const isDev = process.env.NODE_ENV === "development";

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
      <h2 style={{ color: "#c00", fontSize: 18, marginBottom: 12 }}>Něco se pokazilo</h2>
      <p style={{ fontSize: 14, color: "#444", lineHeight: 1.6 }}>
        Při zpracování požadavku došlo k neočekávané chybě. Zkuste to prosím znovu;
        pokud problém přetrvává, kontaktujte podporu a uveďte tento identifikátor:
      </p>
      {error?.digest && (
        <code
          style={{
            display: "inline-block",
            marginTop: 8,
            padding: "4px 8px",
            background: "#f5f5f5",
            borderRadius: 4,
            fontSize: 12,
            fontFamily: "ui-monospace, monospace",
            color: "#666",
          }}
        >
          {error.digest}
        </code>
      )}
      {isDev && (
        <pre
          style={{
            marginTop: 16,
            background: "#f5f5f5",
            padding: 16,
            borderRadius: 8,
            overflowX: "auto",
            fontSize: 13,
            whiteSpace: "pre-wrap",
            border: "1px dashed #f59e0b",
          }}
        >
          <strong style={{ color: "#92400e" }}>[DEV]</strong>
          {"\n"}
          {error?.message}
          {"\n\n"}
          {error?.stack}
        </pre>
      )}
      <button
        onClick={reset}
        style={{ marginTop: 16, padding: "8px 16px", cursor: "pointer" }}
      >
        Zkusit znovu
      </button>
    </div>
  );
}
