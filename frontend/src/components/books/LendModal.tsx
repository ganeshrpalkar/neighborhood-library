"use client";

import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { Check } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { SearchBar } from "@/components/ui/SearchBar";
import { Button } from "@/components/ui/Button";
import { useDebounce } from "@/lib/hooks";
import {
  autocompleteMembers,
  createLoan,
  listMembers,
  errorMessage,
} from "@/lib/api";
import type { Book, MemberSuggestion } from "@/lib/types";
import { cn } from "@/lib/cn";

interface Props {
  open: boolean;
  onClose: () => void;
  onLent: () => void;
  book: Book | null;
}

export function LendModal({ open, onClose, onLent, book }: Props) {
  const [search, setSearch] = useState("");
  const debounced = useDebounce(search, 300);
  const [members, setMembers] = useState<MemberSuggestion[]>([]);
  const [selected, setSelected] = useState<number | null>(null);
  const [dueDate, setDueDate] = useState("");
  const [loadingList, setLoadingList] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) {
      setSearch("");
      setSelected(null);
      setDueDate("");
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoadingList(true);
    const q = debounced.trim();
    const p: Promise<MemberSuggestion[]> = q
      ? autocompleteMembers(q, 8)
      : listMembers({ page: 1, page_size: 8 }).then((r) => r.items);
    p.then((res) => {
      if (!cancelled) setMembers(res);
    })
      .catch((err) => {
        if (!cancelled) toast.error(errorMessage(err, "Failed to load members"));
      })
      .finally(() => {
        if (!cancelled) setLoadingList(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, debounced]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!book || selected == null) {
      toast.error("Pick a member first");
      return;
    }
    setSubmitting(true);
    try {
      await createLoan({
        book_id: book.id,
        member_id: selected,
        due_date: dueDate ? new Date(dueDate).toISOString() : undefined,
      });
      toast.success("Book lent out");
      onLent();
      onClose();
    } catch (err) {
      toast.error(errorMessage(err, "Could not create loan"));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={`Lend "${book?.title ?? ""}"`}>
      <form onSubmit={onSubmit} className="space-y-4">
        <div className="text-sm text-slate-400">
          {book && book.available_copies > 0 ? (
            <span>
              {book.available_copies} of {book.total_copies} copies available
            </span>
          ) : (
            <span className="text-rose-300">No copies available</span>
          )}
        </div>

        <div>
          <span className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-slate-400">
            Member
          </span>
          <SearchBar
            value={search}
            onChange={setSearch}
            placeholder="Search members..."
          />
          <div className="mt-3 max-h-52 space-y-2 overflow-y-auto pr-1">
            {loadingList ? (
              <p className="py-4 text-center text-sm text-slate-500">
                Loading…
              </p>
            ) : members.length === 0 ? (
              <p className="py-4 text-center text-sm text-slate-500">
                No members found
              </p>
            ) : (
              members.map((m) => (
                <button
                  type="button"
                  key={m.id}
                  onClick={() => setSelected(m.id)}
                  className={cn(
                    "flex w-full items-center justify-between rounded-xl border px-4 py-2.5 text-left text-sm transition-colors",
                    selected === m.id
                      ? "border-violet-400/40 bg-violet-500/15 text-white"
                      : "border-white/10 bg-white/5 text-slate-300 hover:bg-white/10"
                  )}
                >
                  <span>
                    <span className="font-medium">{m.name}</span>
                    <span className="ml-2 text-slate-500">{m.email}</span>
                  </span>
                  {selected === m.id && (
                    <Check className="h-4 w-4 text-violet-300" />
                  )}
                </button>
              ))
            )}
          </div>
        </div>

        <Input
          label="Due date (optional)"
          type="date"
          value={dueDate}
          onChange={(e) => setDueDate(e.target.value)}
        />

        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="submit"
            loading={submitting}
            disabled={!book || book.available_copies <= 0 || selected == null}
          >
            Lend book
          </Button>
        </div>
      </form>
    </Modal>
  );
}
