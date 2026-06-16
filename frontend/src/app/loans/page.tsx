"use client";

import { useCallback, useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { AnimatePresence, motion } from "framer-motion";
import { Plus, Repeat, RotateCcw, Calendar, User } from "lucide-react";
import toast from "react-hot-toast";
import { AppShell } from "@/components/layout/AppShell";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/Button";
import { StatusPill } from "@/components/ui/Badge";
import { Pagination } from "@/components/ui/Pagination";
import { RowSkeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { CoverThumb } from "@/components/books/CoverThumb";
import { listLoans, returnLoan, errorMessage } from "@/lib/api";
import type { Loan, LoanStatus } from "@/lib/types";
import { cn } from "@/lib/cn";

const NewLoanModal = dynamic(
  () => import("@/components/loans/NewLoanModal").then((m) => m.NewLoanModal),
  { ssr: false, loading: () => null }
);

const PAGE_SIZE = 12;

type Tab = "all" | LoanStatus;
const TABS: { key: Tab; label: string }[] = [
  { key: "all", label: "All" },
  { key: "active", label: "Active" },
  { key: "overdue", label: "Overdue" },
  { key: "returned", label: "Returned" },
];

export default function LoansPage() {
  return (
    <AppShell>
      <LoansContent />
    </AppShell>
  );
}

function LoansContent() {
  const [loans, setLoans] = useState<Loan[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [tab, setTab] = useState<Tab>("all");
  const [loading, setLoading] = useState(true);
  const [newOpen, setNewOpen] = useState(false);
  const [returningId, setReturningId] = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await listLoans({
        page,
        page_size: PAGE_SIZE,
        status: tab === "all" ? undefined : tab,
      });
      setLoans(res.items);
      setTotal(res.total);
    } catch (err) {
      toast.error(errorMessage(err, "Failed to load loans"));
    } finally {
      setLoading(false);
    }
  }, [page, tab]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    setPage(1);
  }, [tab]);

  async function onReturn(loan: Loan) {
    setReturningId(loan.id);
    try {
      await returnLoan(loan.id);
      toast.success("Book returned");
      void load();
    } catch (err) {
      toast.error(errorMessage(err, "Could not return book"));
    } finally {
      setReturningId(null);
    }
  }

  return (
    <div>
      <PageHeader
        title="Loans"
        subtitle="Track circulation and returns"
        action={
          <Button onClick={() => setNewOpen(true)}>
            <Plus className="h-4 w-4" /> New Loan
          </Button>
        }
      />

      {/* Tabs */}
      <div className="mb-6 inline-flex rounded-2xl border border-white/10 bg-white/5 p-1">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={cn(
              "relative rounded-xl px-4 py-2 text-sm font-medium transition-colors",
              tab === t.key ? "text-white" : "text-slate-400 hover:text-white"
            )}
          >
            {tab === t.key && (
              <motion.span
                layoutId="loan-tab"
                className="absolute inset-0 rounded-xl bg-gradient-to-r from-violet-500/30 to-cyan-500/25 ring-1 ring-violet-400/20"
                transition={{ type: "spring", stiffness: 380, damping: 32 }}
              />
            )}
            <span className="relative z-10">{t.label}</span>
          </button>
        ))}
      </div>

      {loading ? (
        <RowSkeleton count={6} />
      ) : loans.length === 0 ? (
        <EmptyState
          icon={Repeat}
          title="No loans here"
          description={
            tab === "all"
              ? "Create a loan to start tracking circulation."
              : `No ${tab} loans right now.`
          }
          action={
            tab === "all" && (
              <Button onClick={() => setNewOpen(true)}>
                <Plus className="h-4 w-4" /> New Loan
              </Button>
            )
          }
        />
      ) : (
        <div className="space-y-3">
          <AnimatePresence mode="popLayout">
            {loans.map((loan, i) => (
              <motion.div
                key={loan.id}
                layout
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.98 }}
                transition={{ delay: Math.min(i * 0.03, 0.25) }}
                className="glass flex flex-col gap-3 rounded-2xl px-5 py-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex min-w-0 flex-1 items-center gap-3 sm:gap-5">
                  <CoverThumb bookId={loan.book_id} title={loan.book_title} className="h-14 w-10" />
                  <div className="flex min-w-0 flex-1 flex-col gap-2 sm:flex-row sm:items-center sm:gap-6">
                    <div className="flex min-w-0 items-center gap-2">
                      <span className="truncate font-medium text-white">
                        {loan.book_title}
                      </span>
                    </div>
                    <div className="flex min-w-0 items-center gap-2 text-sm text-slate-400">
                      <User className="h-4 w-4 shrink-0 text-cyan-300" />
                      <span className="truncate">{loan.member_name}</span>
                    </div>
                    {loan.due_date && (
                      <div className="flex items-center gap-1.5 text-xs text-slate-500">
                        <Calendar className="h-3.5 w-3.5" />
                        {new Date(loan.due_date).toLocaleDateString()}
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  {loan.fine_amount > 0 && (
                    <span className="text-sm font-medium text-rose-300">
                      ${loan.fine_amount.toFixed(2)}
                    </span>
                  )}
                  <StatusPill status={loan.status} />
                  {loan.status !== "returned" && (
                    <Button
                      variant="ghost"
                      onClick={() => onReturn(loan)}
                      loading={returningId === loan.id}
                      className="px-3 py-2"
                    >
                      <RotateCcw className="h-4 w-4" /> Return
                    </Button>
                  )}
                </div>
              </motion.div>
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

      <NewLoanModal
        open={newOpen}
        onClose={() => setNewOpen(false)}
        onCreated={load}
      />
    </div>
  );
}
