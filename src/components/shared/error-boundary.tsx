"use client";
import { ErrorBoundary as ReactErrorBoundary, FallbackProps } from "react-error-boundary";
import * as Sentry from "@sentry/nextjs";

function ErrorFallback({ error, resetErrorBoundary }: FallbackProps) {
  const message = error instanceof Error ? error.message : String(error);
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center space-y-4 p-8 max-w-md">
        <p className="text-[var(--text-secondary)] text-sm">Niečo sa pokazilo</p>
        <p className="text-[var(--text-tertiary)] text-xs font-mono break-all">{message}</p>
        <button
          onClick={resetErrorBoundary}
          className="px-4 py-2 bg-[var(--accent)] text-white rounded-[var(--radius-md)] text-sm"
        >
          Skúsiť znova
        </button>
      </div>
    </div>
  );
}

function handleError(error: unknown, info: { componentStack?: string | null }) {
  console.error("[ErrorBoundary]", error, info.componentStack);
  Sentry.captureException(error, { extra: { componentStack: info.componentStack } });
}

export function ErrorBoundary({ children, onReset, errorKey }: {
  children: React.ReactNode;
  onReset?: () => void;
  errorKey?: number;
}) {
  return (
    <ReactErrorBoundary
      FallbackComponent={ErrorFallback}
      onError={handleError}
      onReset={onReset}
      resetKeys={errorKey !== undefined ? [errorKey] : undefined}
    >
      {children}
    </ReactErrorBoundary>
  );
}
