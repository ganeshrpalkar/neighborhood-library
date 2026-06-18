"use client";

import { forwardRef } from "react";
import { cn } from "@/lib/cn";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, className, id, ...props }, ref) => {
    return (
      <label className="block">
        {label && (
          <span className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-slate-400">
            {label}
          </span>
        )}
        <input
          ref={ref}
          id={id}
          aria-invalid={error ? true : undefined}
          className={cn(
            "w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-slate-100 outline-none transition-all placeholder:text-slate-500 focus:border-violet-400/50 focus:bg-white/10 focus:ring-2 focus:ring-violet-500/20",
            error &&
              "border-rose-400/50 focus:border-rose-400/60 focus:ring-rose-500/20",
            className
          )}
          {...props}
        />
        {error && <span className="mt-1 block text-xs text-rose-300">{error}</span>}
      </label>
    );
  }
);

Input.displayName = "Input";

interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, error, className, ...props }, ref) => {
    return (
      <label className="block">
        {label && (
          <span className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-slate-400">
            {label}
          </span>
        )}
        <textarea
          ref={ref}
          aria-invalid={error ? true : undefined}
          className={cn(
            "w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-slate-100 outline-none transition-all placeholder:text-slate-500 focus:border-violet-400/50 focus:bg-white/10 focus:ring-2 focus:ring-violet-500/20",
            error &&
              "border-rose-400/50 focus:border-rose-400/60 focus:ring-rose-500/20",
            className
          )}
          {...props}
        />
        {error && <span className="mt-1 block text-xs text-rose-300">{error}</span>}
      </label>
    );
  }
);

Textarea.displayName = "Textarea";

interface SelectProps
  extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, className, children, ...props }, ref) => {
    return (
      <label className="block">
        {label && (
          <span className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-slate-400">
            {label}
          </span>
        )}
        <select
          ref={ref}
          className={cn(
            "w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-slate-100 outline-none transition-all focus:border-violet-400/50 focus:bg-white/10 focus:ring-2 focus:ring-violet-500/20 [&>option]:bg-ink-700",
            className
          )}
          {...props}
        >
          {children}
        </select>
      </label>
    );
  }
);

Select.displayName = "Select";
