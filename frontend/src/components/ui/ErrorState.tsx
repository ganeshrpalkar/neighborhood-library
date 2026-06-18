"use client";

import { AlertTriangle, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/Button";

interface ErrorStateProps {
  title?: string;
  description?: string;
  /** Optional retry handler — renders a "Try again" button when provided. */
  onRetry?: () => void;
  /** Standalone variant paints a full-screen backdrop (for root-level errors). */
  fullscreen?: boolean;
}

/**
 * Presentational fallback shown when an error boundary catches a render error.
 * Shared by the reusable {@link ErrorBoundary} and the Next.js `error.tsx` /
 * `global-error.tsx` route boundaries so every failure looks the same.
 */
export function ErrorState({
  title = "Something went wrong",
  description = "An unexpected error occurred. You can try again, and the issue has been logged.",
  onRetry,
  fullscreen = false,
}: ErrorStateProps) {
  const content = (
    <div className="glass mx-auto flex max-w-md flex-col items-center rounded-3xl p-8 text-center">
      <span className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-500/15 text-rose-300">
        <AlertTriangle className="h-7 w-7" />
      </span>
      <h2 className="text-lg font-semibold text-white">{title}</h2>
      <p className="mt-2 text-sm text-slate-400">{description}</p>
      {onRetry && (
        <Button onClick={onRetry} className="mt-6">
          <RotateCcw className="h-4 w-4" /> Try again
        </Button>
      )}
    </div>
  );

  if (fullscreen) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        {content}
      </div>
    );
  }
  return <div className="py-12">{content}</div>;
}
