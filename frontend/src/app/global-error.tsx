"use client";

import { useEffect } from "react";

/**
 * Root error boundary. Unlike `error.tsx`, this replaces the entire document
 * (including the root layout) when rendering fails at the very top level, so it
 * must render its own `<html>`/`<body>`. Kept dependency-free and inline-styled
 * because the app's stylesheet may not have loaded.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Global error boundary caught:", error);
  }, [error]);

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#06070d",
          color: "#e6e8f0",
          fontFamily: "system-ui, -apple-system, sans-serif",
          padding: "1rem",
        }}
      >
        <div
          style={{
            maxWidth: 420,
            textAlign: "center",
            background: "rgba(20,24,40,0.55)",
            border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: 24,
            padding: "2rem",
          }}
        >
          <h2 style={{ fontSize: 18, fontWeight: 600, margin: 0 }}>
            Something went wrong
          </h2>
          <p style={{ marginTop: 8, fontSize: 14, color: "#94a3b8" }}>
            A critical error occurred while loading the app. Please try again.
          </p>
          <button
            onClick={reset}
            style={{
              marginTop: 24,
              cursor: "pointer",
              borderRadius: 12,
              border: "none",
              padding: "0.6rem 1.2rem",
              fontSize: 14,
              fontWeight: 600,
              color: "white",
              background: "linear-gradient(90deg,#8b5cf6,#22d3ee)",
            }}
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
