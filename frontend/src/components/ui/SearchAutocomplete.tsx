"use client";

import { useEffect, useRef, useState } from "react";
import { Search } from "lucide-react";
import { useDebounce } from "@/lib/hooks";
import { cn } from "@/lib/cn";

/** Search input with a trigram-backed typeahead dropdown. */
export function SearchAutocomplete<T extends { id: number }>({
  value,
  onChange,
  placeholder = "Search...",
  fetcher,
  renderItem,
  onPick,
  minChars = 1,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  fetcher: (q: string) => Promise<T[]>;
  renderItem: (item: T) => React.ReactNode;
  onPick: (item: T) => void;
  minChars?: number;
}) {
  const [items, setItems] = useState<T[]>([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const debounced = useDebounce(value, 220);
  const boxRef = useRef<HTMLDivElement>(null);
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;

  useEffect(() => {
    let cancelled = false;
    if (debounced.trim().length < minChars) {
      setItems([]);
      return;
    }
    fetcherRef.current(debounced.trim())
      .then((res) => {
        if (!cancelled) {
          setItems(res);
          setActive(-1);
        }
      })
      .catch(() => {
        if (!cancelled) setItems([]);
      });
    return () => {
      cancelled = true;
    };
  }, [debounced, minChars]);

  useEffect(() => {
    function onDown(e: MouseEvent) {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  const show = open && items.length > 0;

  function pick(item: T) {
    onPick(item);
    setOpen(false);
  }

  return (
    <div ref={boxRef} className="relative w-full max-w-md">
      <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
      <input
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={(e) => {
          if (!show) return;
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setActive((a) => Math.min(a + 1, items.length - 1));
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setActive((a) => Math.max(a - 1, 0));
          } else if (e.key === "Enter" && active >= 0) {
            e.preventDefault();
            pick(items[active]);
          } else if (e.key === "Escape") {
            setOpen(false);
          }
        }}
        placeholder={placeholder}
        className="w-full rounded-xl border border-white/10 bg-white/5 py-2.5 pl-10 pr-4 text-sm text-slate-100 outline-none transition-all placeholder:text-slate-500 focus:border-violet-400/50 focus:bg-white/10 focus:ring-2 focus:ring-violet-500/20"
      />
      {show && (
        <ul className="absolute z-30 mt-2 max-h-80 w-full overflow-auto rounded-xl border border-white/10 bg-ink-900/95 p-1.5 shadow-2xl backdrop-blur-xl">
          {items.map((it, i) => (
            <li key={it.id}>
              <button
                type="button"
                onMouseEnter={() => setActive(i)}
                onClick={() => pick(it)}
                className={cn(
                  "flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left transition-colors",
                  i === active ? "bg-white/10" : "hover:bg-white/5"
                )}
              >
                {renderItem(it)}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
