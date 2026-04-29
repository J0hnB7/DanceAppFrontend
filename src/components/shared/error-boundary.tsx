"use client";
import { ErrorBoundary as ReactErrorBoundary, FallbackProps } from "react-error-boundary";
import * as Sentry from "@sentry/nextjs";

const isDev = process.env.NODE_ENV === "development";

// MED-31: pre-fix this rendered raw error.message in mono font, exposing JS
// jargon ("Cannot read properties of undefined (reading 'name')") to end
// users — confusing UX, no actionable info, mild info disclosure. Now: only
// dev sees the raw message; prod sees friendly text + a Sentry digest the
// user can quote to support.
function ErrorFallback({ error, resetErrorBoundary }: FallbackProps) {
  const message = error instanceof Error ? error.message : String(error);
  const digest = (error as { digest?: string })?.digest;
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center space-y-4 p-8 max-w-md">
        <p className="text-[var(--text-primary)] text-base font-semibold">Niečo sa pokazilo</p>
        <p className="text-[var(--text-secondary)] text-sm">
          Skúste obnoviť stránku. Ak chyba pretrváva, kontaktujte podporu
          {digest && <> a uveďte tento identifikátor: <code className="font-mono text-xs">{digest}</code></>}.
        </p>
        {isDev && (
          <p className="text-[var(--text-tertiary)] text-xs font-mono break-all border-t pt-2 mt-2">
            [DEV] {message}
          </p>
        )}
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
