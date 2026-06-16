"use client";

import { useCallback, useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { AnimatePresence } from "framer-motion";
import { Plus, BookOpen } from "lucide-react";
import toast from "react-hot-toast";
import { AppShell } from "@/components/layout/AppShell";
import { PageHeader } from "@/components/layout/PageHeader";
import { SearchAutocomplete } from "@/components/ui/SearchAutocomplete";
import { CoverThumb } from "@/components/books/CoverThumb";
import { Button } from "@/components/ui/Button";
import { Pagination } from "@/components/ui/Pagination";
import { CardSkeletonGrid } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { BookCard } from "@/components/books/BookCard";
import { useDebounce } from "@/lib/hooks";
import { autocompleteBooks, deleteBook, listBooks, errorMessage } from "@/lib/api";
import type { Book } from "@/lib/types";

const BookFormModal = dynamic(
  () => import("@/components/books/BookFormModal").then((m) => m.BookFormModal),
  { ssr: false, loading: () => null }
);
const LendModal = dynamic(
  () => import("@/components/books/LendModal").then((m) => m.LendModal),
  { ssr: false, loading: () => null }
);

const PAGE_SIZE = 12;

export default function BooksPage() {
  return (
    <AppShell>
      <BooksContent />
    </AppShell>
  );
}

function BooksContent() {
  const [books, setBooks] = useState<Book[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const debounced = useDebounce(search, 350);
  const [loading, setLoading] = useState(true);

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Book | null>(null);
  const [lendBook, setLendBook] = useState<Book | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Book | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await listBooks({
        page,
        page_size: PAGE_SIZE,
        search: debounced || undefined,
      });
      setBooks(res.items);
      setTotal(res.total);
    } catch (err) {
      toast.error(errorMessage(err, "Failed to load books"));
    } finally {
      setLoading(false);
    }
  }, [page, debounced]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    setPage(1);
  }, [debounced]);

  async function confirmDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteBook(deleteTarget.id);
      toast.success("Book deleted");
      setDeleteTarget(null);
      void load();
    } catch (err) {
      toast.error(errorMessage(err, "Could not delete book"));
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="Books"
        subtitle="Browse and manage your collection"
        action={
          <Button
            onClick={() => {
              setEditing(null);
              setFormOpen(true);
            }}
          >
            <Plus className="h-4 w-4" /> Add Book
          </Button>
        }
      />

      <div className="mb-6">
        <SearchAutocomplete
          value={search}
          onChange={setSearch}
          placeholder="Search by title or author..."
          fetcher={(q) => autocompleteBooks(q, 8)}
          onPick={(b) => {
            setSearch(b.title);
            setPage(1);
          }}
          renderItem={(b) => (
            <>
              <CoverThumb bookId={b.id} title={b.title} className="h-9 w-7" />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm text-slate-100">{b.title}</span>
                <span className="block truncate text-xs text-slate-400">{b.author}</span>
              </span>
              <span className="shrink-0 text-xs text-slate-500">{b.available_copies} left</span>
            </>
          )}
        />
      </div>

      {loading ? (
        <CardSkeletonGrid count={8} />
      ) : books.length === 0 ? (
        <EmptyState
          icon={BookOpen}
          title="No books found"
          description={
            debounced
              ? "Try a different search term."
              : "Add your first book to get started."
          }
          action={
            !debounced && (
              <Button
                onClick={() => {
                  setEditing(null);
                  setFormOpen(true);
                }}
              >
                <Plus className="h-4 w-4" /> Add Book
              </Button>
            )
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          <AnimatePresence mode="popLayout">
            {books.map((book, i) => (
              <BookCard
                key={book.id}
                book={book}
                index={i}
                onEdit={() => {
                  setEditing(book);
                  setFormOpen(true);
                }}
                onDelete={() => setDeleteTarget(book)}
                onLend={() => setLendBook(book)}
              />
            ))}
          </AnimatePresence>
        </div>
      )}

      <Pagination
        page={page}
        pageSize={PAGE_SIZE}
        total={total}
        onPage={setPage}
      />

      <BookFormModal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        onSaved={load}
        book={editing}
      />
      <LendModal
        open={!!lendBook}
        onClose={() => setLendBook(null)}
        onLent={load}
        book={lendBook}
      />
      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={confirmDelete}
        loading={deleting}
        title="Delete book"
        message={`Delete "${deleteTarget?.title}"? This cannot be undone.`}
      />
    </div>
  );
}
