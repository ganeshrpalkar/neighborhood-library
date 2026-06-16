"use client";

import { useState } from "react";
import { BookOpen } from "lucide-react";
import { bookCoverUrl } from "@/lib/api";
import { cn } from "@/lib/cn";

/** Small book-cover thumbnail served from the database, with a graceful fallback. */
export function CoverThumb({
  bookId,
  title,
  className,
}: {
  bookId: number;
  title?: string;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);
  const base = cn("shrink-0 overflow-hidden rounded-md shadow-md", className ?? "h-12 w-9");

  if (failed) {
    return (
      <div className={cn(base, "flex items-center justify-center bg-gradient-to-br from-violet-500/30 to-cyan-500/30")}>
        <BookOpen className="h-4 w-4 text-white/80" />
      </div>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={bookCoverUrl(bookId)}
      alt={title ? `${title} cover` : "book cover"}
      loading="lazy"
      onError={() => setFailed(true)}
      className={cn(base, "object-cover")}
    />
  );
}
