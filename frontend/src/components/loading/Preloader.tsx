"use client";

import { motion } from "framer-motion";

interface PreloaderProps {
  label?: string;
}

// A gentle fan/stack of book spines that rise, settle, and breathe in a loop.
const books = [
  { color: "#8b5cf6", rotate: -14, x: -34, delay: 0 },
  { color: "#22d3ee", rotate: -5, x: -11, delay: 0.12 },
  { color: "#34d399", rotate: 5, x: 12, delay: 0.24 },
  { color: "#a78bfa", rotate: 15, x: 35, delay: 0.36 },
];

/**
 * Full-screen fixed splash overlay. Solid #06070d background with the app's
 * radial-glow vibe, an animated branded book-fan emblem, the wordmark, an
 * indeterminate shimmer bar, and an optional label.
 */
export function Preloader({ label = "Loading…" }: PreloaderProps) {
  return (
    <motion.div
      role="status"
      aria-label={label}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4 }}
      className="fixed inset-0 z-[100] flex flex-col items-center justify-center gap-8 overflow-hidden"
      style={{
        backgroundColor: "#06070d",
        backgroundImage:
          "radial-gradient(60rem 40rem at 10% -10%, rgba(139,92,246,0.18), transparent 60%), radial-gradient(50rem 40rem at 110% 0%, rgba(34,211,238,0.14), transparent 55%), radial-gradient(50rem 50rem at 50% 120%, rgba(52,211,153,0.10), transparent 60%)",
      }}
    >
      {/* Animated emblem: a fan of book spines */}
      <div className="relative flex h-28 w-44 items-end justify-center">
        <span className="absolute bottom-2 h-10 w-40 rounded-full bg-accent-violet/20 blur-2xl" />
        {books.map((book, i) => (
          <motion.span
            key={i}
            className="absolute bottom-3 h-20 w-7 rounded-sm shadow-lg"
            style={{
              background: `linear-gradient(180deg, ${book.color}, ${book.color}99)`,
              transformOrigin: "bottom center",
              boxShadow: `0 8px 30px -8px ${book.color}aa`,
            }}
            initial={{ y: 24, opacity: 0, rotate: book.rotate, x: book.x }}
            animate={{
              y: [24, 0, -6, 0],
              opacity: 1,
              rotate: [book.rotate, book.rotate, book.rotate * 1.25, book.rotate],
              x: book.x,
            }}
            transition={{
              duration: 2.4,
              delay: book.delay,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          >
            {/* page edge highlight */}
            <span className="absolute right-0 top-1 bottom-1 w-1 rounded-r-sm bg-white/30" />
          </motion.span>
        ))}
      </div>

      {/* Wordmark */}
      <div className="flex flex-col items-center gap-2 text-center">
        <motion.h1
          className="font-book gradient-text bg-[length:200%_auto] text-3xl font-semibold tracking-tight sm:text-4xl"
          animate={{ backgroundPosition: ["0% 50%", "100% 50%", "0% 50%"] }}
          transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
        >
          Neighborhood Library
        </motion.h1>

        {/* Indeterminate shimmer / progress bar */}
        <div className="relative mt-2 h-1 w-48 overflow-hidden rounded-full bg-white/10">
          <motion.span
            className="absolute inset-y-0 w-1/3 rounded-full"
            style={{
              background: "linear-gradient(90deg, #8b5cf6, #22d3ee, #34d399)",
            }}
            animate={{ x: ["-120%", "320%"] }}
            transition={{ duration: 1.4, repeat: Infinity, ease: "easeInOut" }}
          />
        </div>

        <p className="mt-2 text-sm font-medium tracking-wide text-slate-400">
          {label}
        </p>
      </div>
    </motion.div>
  );
}

export default Preloader;
