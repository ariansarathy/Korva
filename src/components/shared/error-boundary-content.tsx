"use client";

import { AlertTriangle, RotateCcw, Home } from "lucide-react";
import Link from "next/link";

interface ErrorBoundaryContentProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export function ErrorBoundaryContent({
  error,
  reset,
}: ErrorBoundaryContentProps) {
  const isDev = process.env.NODE_ENV === "development";

  return (
    <div className="flex min-h-[400px] items-center justify-center p-6">
      <div className="w-full max-w-md rounded-xl border border-border bg-surface p-8 text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-danger/10">
          <AlertTriangle className="h-6 w-6 text-danger" />
        </div>

        <h2 className="text-lg font-bold text-foreground">
          Something went wrong
        </h2>
        <p className="mt-2 text-sm text-secondary">
          An unexpected error occurred. Please try again or return to the
          dashboard.
        </p>

        {isDev && error.message && (
          <pre className="mt-4 max-h-32 overflow-auto rounded-lg bg-background p-3 text-left text-xs text-danger">
            {error.message}
          </pre>
        )}

        {error.digest && (
          <p className="mt-2 text-[10px] text-muted">
            Error ID: {error.digest}
          </p>
        )}

        <div className="mt-6 flex items-center justify-center gap-3">
          <button
            onClick={reset}
            className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary-hover"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Try again
          </button>
          <Link
            href="/dashboard"
            className="flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-surface-hover"
          >
            <Home className="h-3.5 w-3.5" />
            Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
