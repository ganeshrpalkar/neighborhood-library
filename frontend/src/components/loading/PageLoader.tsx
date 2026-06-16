"use client";

import { motion } from "framer-motion";
import { Spinner } from "./Spinner";

interface PageLoaderProps {
  label?: string;
}

/**
 * Centered loader that fills its container. Intended as the body of Next.js
 * route-segment `loading.tsx` files.
 */
export function PageLoader({ label }: PageLoaderProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.25 }}
      className="flex min-h-[60vh] w-full flex-col items-center justify-center gap-4"
    >
      <div className="relative flex items-center justify-center">
        <span className="absolute h-12 w-12 rounded-full bg-accent-violet/10 blur-xl" />
        <Spinner className="h-8 w-8" />
      </div>
      {label ? (
        <p className="text-sm font-medium tracking-wide text-slate-400">
          {label}
        </p>
      ) : null}
    </motion.div>
  );
}

export default PageLoader;
