"use client";

import { useCallback, useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { AnimatePresence } from "framer-motion";
import { Plus, Users } from "lucide-react";
import toast from "react-hot-toast";
import { AppShell } from "@/components/layout/AppShell";
import { PageHeader } from "@/components/layout/PageHeader";
import { SearchAutocomplete } from "@/components/ui/SearchAutocomplete";
import { Button } from "@/components/ui/Button";
import { Pagination } from "@/components/ui/Pagination";
import { CardSkeletonGrid } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { MemberCard } from "@/components/members/MemberCard";
import { useDebounce } from "@/lib/hooks";
import { autocompleteMembers, deleteMember, listMembers, errorMessage } from "@/lib/api";
import type { Member } from "@/lib/types";

const MemberFormModal = dynamic(
  () => import("@/components/members/MemberFormModal").then((m) => m.MemberFormModal),
  { ssr: false, loading: () => null }
);
const MemberLoansDrawer = dynamic(
  () => import("@/components/members/MemberLoansDrawer").then((m) => m.MemberLoansDrawer),
  { ssr: false, loading: () => null }
);

const PAGE_SIZE = 12;

export default function MembersPage() {
  return (
    <AppShell>
      <MembersContent />
    </AppShell>
  );
}

function MembersContent() {
  const [members, setMembers] = useState<Member[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const debounced = useDebounce(search, 350);
  const [loading, setLoading] = useState(true);

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Member | null>(null);
  const [drawerMember, setDrawerMember] = useState<Member | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Member | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await listMembers({
        page,
        page_size: PAGE_SIZE,
        search: debounced || undefined,
      });
      setMembers(res.items);
      setTotal(res.total);
    } catch (err) {
      toast.error(errorMessage(err, "Failed to load members"));
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
      await deleteMember(deleteTarget.id);
      toast.success("Member deleted");
      setDeleteTarget(null);
      void load();
    } catch (err) {
      toast.error(errorMessage(err, "Could not delete member"));
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="Members"
        subtitle="Your community of readers"
        action={
          <Button
            onClick={() => {
              setEditing(null);
              setFormOpen(true);
            }}
          >
            <Plus className="h-4 w-4" /> Add Member
          </Button>
        }
      />

      <div className="mb-6">
        <SearchAutocomplete
          value={search}
          onChange={setSearch}
          placeholder="Search by name or email..."
          fetcher={(q) => autocompleteMembers(q, 8)}
          onPick={(m) => {
            setSearch(m.name);
            setPage(1);
          }}
          renderItem={(m) => (
            <>
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-cyan-500 text-xs font-semibold text-white">
                {m.name.charAt(0).toUpperCase()}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm text-slate-100">{m.name}</span>
                <span className="block truncate text-xs text-slate-400">{m.email}</span>
              </span>
            </>
          )}
        />
      </div>

      {loading ? (
        <CardSkeletonGrid count={8} />
      ) : members.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No members found"
          description={
            debounced
              ? "Try a different search term."
              : "Add your first member to get started."
          }
          action={
            !debounced && (
              <Button
                onClick={() => {
                  setEditing(null);
                  setFormOpen(true);
                }}
              >
                <Plus className="h-4 w-4" /> Add Member
              </Button>
            )
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          <AnimatePresence mode="popLayout">
            {members.map((member, i) => (
              <MemberCard
                key={member.id}
                member={member}
                index={i}
                onOpen={() => setDrawerMember(member)}
                onEdit={() => {
                  setEditing(member);
                  setFormOpen(true);
                }}
                onDelete={() => setDeleteTarget(member)}
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

      <MemberFormModal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        onSaved={load}
        member={editing}
      />
      <MemberLoansDrawer
        member={drawerMember}
        onClose={() => setDrawerMember(null)}
      />
      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={confirmDelete}
        loading={deleting}
        title="Delete member"
        message={`Delete "${deleteTarget?.name}"? This cannot be undone.`}
      />
    </div>
  );
}
