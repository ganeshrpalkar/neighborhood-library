"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X, BookMarked, RotateCcw, Calendar } from "lucide-react";
import toast from "react-hot-toast";
import { StatusPill } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { RowSkeleton } from "@/components/ui/Skeleton";
import { getMemberLoans, returnLoan, errorMessage } from "@/lib/api";
import type { Loan, Member } from "@/lib/types";

export function MemberLoansDrawer({
  member,
  onClose,
}: {
  member: Member | null;
  onClose: () => void;
}) {
  const [loans, setLoans] = useState<Loan[]>([]);
  const [loading, setLoading] = useState(false);
  const [returningId, setReturningId] = useState<number | null>(null);

  useEffect(() => {
    if (!member) return;
    let cancelled = false;
    setLoading(true);
    getMemberLoans(member.id)
      .then((data) => {
        if (!cancelled) setLoans(data);
      })
      .catch((err) => {
        if (!cancelled) toast.error(errorMessage(err, "Failed to load loans"));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [member]);

  async function onReturn(loan: Loan) {
    setReturningId(loan.id);
    try {
      const updated = await returnLoan(loan.id);
      setLoans((prev) => prev.map((l) => (l.id === loan.id ? updated : l)));
      toast.success("Book returned");
    } catch (err) {
      toast.error(errorMessage(err, "Could not return book"));
    } finally {
      setReturningId(null);
    }
  }

  return (
    <AnimatePresence>
      {member && (
        <motion.div
          className="fixed inset-0 z-50 flex justify-end"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", stiffness: 320, damping: 34 }}
            className="glass-strong relative z-10 flex h-full w-full max-w-md flex-col p-6"
          >
            <div className="mb-6 flex items-start justify-between">
              <div>
                <h3 className="text-lg font-semibold text-white">
                  {member.name}
                </h3>
                <p className="text-sm text-slate-400">{member.email}</p>
              </div>
              <button
                onClick={onClose}
                className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-white/10 hover:text-white"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <h4 className="mb-3 flex items-center gap-2 text-sm font-medium text-slate-300">
              <BookMarked className="h-4 w-4 text-cyan-300" /> Loan history
            </h4>

            <div className="flex-1 space-y-3 overflow-y-auto pr-1">
              {loading ? (
                <RowSkeleton count={4} />
              ) : loans.length === 0 ? (
                <p className="py-10 text-center text-sm text-slate-500">
                  No loans for this member.
                </p>
              ) : (
                loans.map((loan, i) => (
                  <motion.div
                    key={loan.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.04 }}
                    className="glass rounded-2xl p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <p className="min-w-0 truncate font-medium text-white">
                        {loan.book_title}
                      </p>
                      <StatusPill status={loan.status} />
                    </div>
                    <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-400">
                      {loan.due_date && (
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          Due {new Date(loan.due_date).toLocaleDateString()}
                        </span>
                      )}
                      {loan.fine_amount > 0 && (
                        <span className="text-rose-300">
                          Fine ${loan.fine_amount.toFixed(2)}
                        </span>
                      )}
                    </div>
                    {loan.status !== "returned" && (
                      <Button
                        variant="ghost"
                        onClick={() => onReturn(loan)}
                        loading={returningId === loan.id}
                        className="mt-3 w-full"
                      >
                        <RotateCcw className="h-4 w-4" /> Return
                      </Button>
                    )}
                  </motion.div>
                ))
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
