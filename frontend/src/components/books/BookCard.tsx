"use client";

import { forwardRef } from "react";
import { motion } from "framer-motion";
import { BookOpen, Pencil, Trash2, HandHeart } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { bookCoverUrl } from "@/lib/api";
import type { Book } from "@/lib/types";
import { cn } from "@/lib/cn";

const SPINE = ["#8b5cf6", "#22d3ee", "#34d399", "#f472b6", "#fbbf24", "#60a5fa"];

interface BookCardProps {
  book: Book;
  index: number;
  onEdit: () => void;
  onDelete: () => void;
  onLend: () => void;
}

export const BookCard = forwardRef<HTMLDivElement, BookCardProps>(function BookCard(
  { book, index, onEdit, onDelete, onLend },
  ref
) {
  const spine = SPINE[book.id % SPINE.length];
  const available = book.available_copies > 0;

  return (
    <motion.div
      ref={ref}
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ delay: Math.min(index * 0.04, 0.3) }}
      whileHover={{ y: -6 }}
      className="glass group flex flex-col rounded-3xl p-5 transition-shadow hover:shadow-glow"
    >
      <div className="mb-4 flex items-start gap-4">
        <div
          className="relative h-24 w-16 shrink-0 overflow-hidden rounded-lg shadow-lg"
          style={{ background: `linear-gradient(135deg, ${spine}, ${spine}aa)` }}
        >
          {book.has_cover ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={bookCoverUrl(book.id)}
              alt={`${book.title} cover`}
              loading="lazy"
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center">
              <BookOpen className="h-6 w-6 text-white/90" />
            </div>
          )}
          <span className="absolute inset-y-0 left-0 w-1.5 rounded-l-lg bg-black/20" />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="truncate font-semibold text-white" title={book.title}>
            {book.title}
          </h3>
          <p className="truncate text-sm text-slate-400">{book.author}</p>
          {book.genre && (
            <Badge className="mt-2 bg-white/5 text-slate-300">
              {book.genre}
            </Badge>
          )}
        </div>
      </div>

      <div className="mb-4 flex items-center gap-2 text-xs text-slate-500">
        {book.published_year && <span>{book.published_year}</span>}
        {book.publisher && (
          <>
            <span className="text-slate-700">•</span>
            <span className="truncate">{book.publisher}</span>
          </>
        )}
      </div>

      <div className="mt-auto flex items-center justify-between">
        <Badge
          className={cn(
            "border",
            available
              ? "border-emerald-400/20 bg-emerald-500/15 text-emerald-300"
              : "border-rose-400/20 bg-rose-500/15 text-rose-300"
          )}
        >
          {book.available_copies}/{book.total_copies} available
        </Badge>

        <div className="flex items-center gap-1">
          <button
            onClick={onLend}
            disabled={!available}
            title="Lend"
            className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-violet-500/15 hover:text-violet-300 disabled:cursor-not-allowed disabled:opacity-30"
          >
            <HandHeart className="h-4 w-4" />
          </button>
          <button
            onClick={onEdit}
            title="Edit"
            className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-white/10 hover:text-white"
          >
            <Pencil className="h-4 w-4" />
          </button>
          <button
            onClick={onDelete}
            title="Delete"
            className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-rose-500/15 hover:text-rose-300"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>
    </motion.div>
  );
});

BookCard.displayName = "BookCard";
