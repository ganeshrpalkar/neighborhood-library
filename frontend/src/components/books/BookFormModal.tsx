"use client";

import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { createBook, updateBook, uploadBookCover, bookCoverUrl, errorMessage } from "@/lib/api";
import type { Book, BookInput } from "@/lib/types";

interface Props {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  book?: Book | null;
}

const empty = {
  title: "",
  author: "",
  isbn: "",
  publisher: "",
  published_year: "",
  genre: "",
  total_copies: "1",
};

export function BookFormModal({ open, onClose, onSaved, book }: Props) {
  const [form, setForm] = useState(empty);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const editing = !!book;

  useEffect(() => {
    if (open) {
      setCoverFile(null);
      setForm(
        book
          ? {
              title: book.title,
              author: book.author,
              isbn: book.isbn ?? "",
              publisher: book.publisher ?? "",
              published_year: book.published_year?.toString() ?? "",
              genre: book.genre ?? "",
              total_copies: book.total_copies.toString(),
            }
          : empty
      );
    }
  }, [open, book]);

  function set<K extends keyof typeof form>(key: K, val: string) {
    setForm((f) => ({ ...f, [key]: val }));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const payload: BookInput = {
        title: form.title.trim(),
        author: form.author.trim(),
        total_copies: Math.max(0, parseInt(form.total_copies || "0", 10)),
      };
      if (form.isbn.trim()) payload.isbn = form.isbn.trim();
      if (form.publisher.trim()) payload.publisher = form.publisher.trim();
      if (form.genre.trim()) payload.genre = form.genre.trim();
      if (form.published_year.trim())
        payload.published_year = parseInt(form.published_year, 10);

      const saved =
        editing && book ? await updateBook(book.id, payload) : await createBook(payload);
      if (coverFile) {
        await uploadBookCover(saved.id, coverFile);
      }
      toast.success(editing ? "Book updated" : "Book added");
      onSaved();
      onClose();
    } catch (err) {
      toast.error(errorMessage(err, "Could not save book"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={editing ? "Edit book" : "Add book"}>
      <form onSubmit={onSubmit} className="space-y-4">
        <Input
          label="Title"
          value={form.title}
          onChange={(e) => set("title", e.target.value)}
          required
          placeholder="The Midnight Library"
        />
        <Input
          label="Author"
          value={form.author}
          onChange={(e) => set("author", e.target.value)}
          required
          placeholder="Matt Haig"
        />
        <div className="grid grid-cols-2 gap-4">
          <Input
            label="ISBN"
            value={form.isbn}
            onChange={(e) => set("isbn", e.target.value)}
            placeholder="978-..."
          />
          <Input
            label="Genre"
            value={form.genre}
            onChange={(e) => set("genre", e.target.value)}
            placeholder="Fiction"
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Publisher"
            value={form.publisher}
            onChange={(e) => set("publisher", e.target.value)}
            placeholder="Canongate"
          />
          <Input
            label="Published year"
            type="number"
            value={form.published_year}
            onChange={(e) => set("published_year", e.target.value)}
            placeholder="2020"
          />
        </div>
        <Input
          label="Total copies"
          type="number"
          min={0}
          value={form.total_copies}
          onChange={(e) => set("total_copies", e.target.value)}
          required
        />

        <div>
          <span className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-slate-400">
            Cover image
          </span>
          <div className="flex items-center gap-3">
            {(coverFile || (editing && book?.has_cover)) && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={coverFile ? URL.createObjectURL(coverFile) : bookCoverUrl(book!.id, book!.updated_at)}
                alt="cover preview"
                className="h-16 w-11 shrink-0 rounded-md object-cover shadow"
              />
            )}
            <input
              type="file"
              accept="image/*"
              onChange={(e) => setCoverFile(e.target.files?.[0] ?? null)}
              className="block w-full text-sm text-slate-400 file:mr-3 file:rounded-lg file:border-0 file:bg-violet-500/20 file:px-3 file:py-2 file:text-sm file:font-medium file:text-violet-200 hover:file:bg-violet-500/30"
            />
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" loading={loading}>
            {editing ? "Save changes" : "Add book"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
