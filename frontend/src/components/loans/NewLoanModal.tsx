"use client";

import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { Check, BookOpen, User } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { SearchBar } from "@/components/ui/SearchBar";
import { Button } from "@/components/ui/Button";
import { useDebounce } from "@/lib/hooks";
import {
  autocompleteBooks,
  autocompleteMembers,
  createLoan,
  listBooks,
  listMembers,
  errorMessage,
} from "@/lib/api";
import type { BookSuggestion, MemberSuggestion } from "@/lib/types";
import { cn } from "@/lib/cn";

interface Props {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}

export function NewLoanModal({ open, onClose, onCreated }: Props) {
  const [bookSearch, setBookSearch] = useState("");
  const [memberSearch, setMemberSearch] = useState("");
  const dBook = useDebounce(bookSearch, 300);
  const dMember = useDebounce(memberSearch, 300);
  const [books, setBooks] = useState<BookSuggestion[]>([]);
  const [members, setMembers] = useState<MemberSuggestion[]>([]);
  const [bookId, setBookId] = useState<number | null>(null);
  const [memberId, setMemberId] = useState<number | null>(null);
  const [dueDate, setDueDate] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) {
      setBookSearch("");
      setMemberSearch("");
      setBookId(null);
      setMemberId(null);
      setDueDate("");
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const q = dBook.trim();
    const p: Promise<BookSuggestion[]> = q
      ? autocompleteBooks(q, 8)
      : listBooks({ page: 1, page_size: 8 }).then((r) => r.items);
    p.then(setBooks).catch((err) => toast.error(errorMessage(err, "Failed to load books")));
  }, [open, dBook]);

  useEffect(() => {
    if (!open) return;
    const q = dMember.trim();
    const p: Promise<MemberSuggestion[]> = q
      ? autocompleteMembers(q, 8)
      : listMembers({ page: 1, page_size: 8 }).then((r) => r.items);
    p.then(setMembers).catch((err) => toast.error(errorMessage(err, "Failed to load members")));
  }, [open, dMember]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (bookId == null || memberId == null) {
      toast.error("Pick both a book and a member");
      return;
    }
    setSubmitting(true);
    try {
      await createLoan({
        book_id: bookId,
        member_id: memberId,
        due_date: dueDate ? new Date(dueDate).toISOString() : undefined,
      });
      toast.success("Loan created");
      onCreated();
      onClose();
    } catch (err) {
      toast.error(errorMessage(err, "Could not create loan"));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="New loan">
      <form onSubmit={onSubmit} className="space-y-5">
        {/* Book picker */}
        <div>
          <span className="mb-1.5 flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-slate-400">
            <BookOpen className="h-3.5 w-3.5" /> Book
          </span>
          <SearchBar
            value={bookSearch}
            onChange={setBookSearch}
            placeholder="Search books..."
          />
          <div className="mt-2 max-h-40 space-y-2 overflow-y-auto pr-1">
            {books.length === 0 ? (
              <p className="py-3 text-center text-sm text-slate-500">
                No books found
              </p>
            ) : (
              books.map((b) => {
                const disabled = b.available_copies <= 0;
                return (
                  <button
                    type="button"
                    key={b.id}
                    disabled={disabled}
                    onClick={() => setBookId(b.id)}
                    className={cn(
                      "flex w-full items-center justify-between rounded-xl border px-4 py-2.5 text-left text-sm transition-colors disabled:cursor-not-allowed disabled:opacity-40",
                      bookId === b.id
                        ? "border-violet-400/40 bg-violet-500/15 text-white"
                        : "border-white/10 bg-white/5 text-slate-300 hover:bg-white/10"
                    )}
                  >
                    <span className="min-w-0 truncate">
                      <span className="font-medium">{b.title}</span>
                      <span className="ml-2 text-slate-500">
                        {b.available_copies} available
                      </span>
                    </span>
                    {bookId === b.id && (
                      <Check className="h-4 w-4 shrink-0 text-violet-300" />
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Member picker */}
        <div>
          <span className="mb-1.5 flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-slate-400">
            <User className="h-3.5 w-3.5" /> Member
          </span>
          <SearchBar
            value={memberSearch}
            onChange={setMemberSearch}
            placeholder="Search members..."
          />
          <div className="mt-2 max-h-40 space-y-2 overflow-y-auto pr-1">
            {members.length === 0 ? (
              <p className="py-3 text-center text-sm text-slate-500">
                No members found
              </p>
            ) : (
              members.map((m) => (
                <button
                  type="button"
                  key={m.id}
                  onClick={() => setMemberId(m.id)}
                  className={cn(
                    "flex w-full items-center justify-between rounded-xl border px-4 py-2.5 text-left text-sm transition-colors",
                    memberId === m.id
                      ? "border-cyan-400/40 bg-cyan-500/15 text-white"
                      : "border-white/10 bg-white/5 text-slate-300 hover:bg-white/10"
                  )}
                >
                  <span className="min-w-0 truncate">
                    <span className="font-medium">{m.name}</span>
                    <span className="ml-2 text-slate-500">{m.email}</span>
                  </span>
                  {memberId === m.id && (
                    <Check className="h-4 w-4 shrink-0 text-cyan-300" />
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

        <div className="flex justify-end gap-3 pt-1">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="submit"
            loading={submitting}
            disabled={bookId == null || memberId == null}
          >
            Create loan
          </Button>
        </div>
      </form>
    </Modal>
  );
}
