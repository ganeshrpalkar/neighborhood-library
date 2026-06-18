"use client";

import { Component, type ErrorInfo, type ReactNode } from "react";
import { ErrorState } from "@/components/ui/ErrorState";

interface Props {
  children: ReactNode;
  /** Custom fallback. Receives the error and a reset callback. */
  fallback?: (error: Error, reset: () => void) => ReactNode;
}

interface State {
  error: Error | null;
}

/**
 * Application-level error boundary.
 *
 * React only surfaces render-time errors through class components, so this
 * wraps the app (see `app/layout.tsx`) to stop a single broken subtree from
 * blanking the whole page. It renders a recoverable {@link ErrorState} fallback
 * and exposes a `reset()` so the user can retry without a full reload.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // Hook for an error-reporting service (Sentry, etc.).
    console.error("ErrorBoundary caught an error:", error, info.componentStack);
  }

  reset = () => this.setState({ error: null });

  render() {
    const { error } = this.state;
    if (error) {
      if (this.props.fallback) return this.props.fallback(error, this.reset);
      return <ErrorState onRetry={this.reset} />;
    }
    return this.props.children;
  }
}
