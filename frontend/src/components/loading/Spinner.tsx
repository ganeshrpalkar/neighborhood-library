"use client";

import { motion } from "framer-motion";

interface SpinnerProps {
  className?: string;
}

/**
 * Tiny reusable inline spinner: a rotating conic ring with a violet→cyan
 * gradient masked into a thin ring shape. Size is controlled via `className`
 * (defaults to a small 1.25rem square).
 */
export function Spinner({ className }: SpinnerProps) {
  return (
    <motion.span
      role="status"
      aria-label="Loading"
      className={`inline-block h-5 w-5 rounded-full ${className ?? ""}`}
      style={{
        background:
          "conic-gradient(from 0deg, transparent 0deg, #8b5cf6 140deg, #22d3ee 300deg, transparent 360deg)",
        WebkitMask:
          "radial-gradient(farthest-side, transparent calc(100% - 2.5px), #000 calc(100% - 2px))",
        mask: "radial-gradient(farthest-side, transparent calc(100% - 2.5px), #000 calc(100% - 2px))",
      }}
      animate={{ rotate: 360 }}
      transition={{ duration: 0.9, repeat: Infinity, ease: "linear" }}
    />
  );
}

export default Spinner;
