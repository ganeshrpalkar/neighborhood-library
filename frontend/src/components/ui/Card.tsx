"use client";

import { forwardRef } from "react";
import { motion, type HTMLMotionProps } from "framer-motion";
import { cn } from "@/lib/cn";

type Variant = "grid" | "row";
type Glow = "violet" | "cyan" | "none";

const GLOW: Record<Glow, string> = {
  violet: "hover:shadow-glow",
  cyan: "hover:shadow-glow-cyan",
  none: "",
};

interface CardProps extends Omit<HTMLMotionProps<"div">, "ref"> {
  /** Position in a list — used to stagger the entrance animation. */
  index?: number;
  /** `grid` = tile in a card grid; `row` = full-width list row. */
  variant?: Variant;
  /** Accent colour for the hover glow. */
  glow?: Glow;
  /** Lift the card on hover (default for grid tiles). */
  hoverLift?: boolean;
}

/**
 * Shared glass surface for every primary list view (books, members, loans).
 *
 * Centralises the entrance/hover animation, glass styling, and spacing so the
 * individual card components only describe their own content. Extra props
 * (event handlers, `className`, etc.) are forwarded to the underlying
 * `motion.div`.
 */
export const Card = forwardRef<HTMLDivElement, CardProps>(function Card(
  {
    index = 0,
    variant = "grid",
    glow = "violet",
    hoverLift,
    className,
    children,
    ...props
  },
  ref
) {
  const lift = hoverLift ?? variant === "grid";
  return (
    <motion.div
      ref={ref}
      layout
      initial={{ opacity: 0, y: variant === "grid" ? 20 : 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: variant === "grid" ? 0.95 : 0.98 }}
      transition={{ delay: Math.min(index * (variant === "grid" ? 0.04 : 0.03), variant === "grid" ? 0.3 : 0.25) }}
      whileHover={lift ? { y: -6 } : undefined}
      className={cn(
        "glass transition-shadow",
        variant === "grid"
          ? "group flex flex-col rounded-3xl p-5"
          : "flex flex-col gap-3 rounded-2xl px-5 py-4 sm:flex-row sm:items-center sm:justify-between",
        GLOW[glow],
        className
      )}
      {...props}
    >
      {children}
    </motion.div>
  );
});
