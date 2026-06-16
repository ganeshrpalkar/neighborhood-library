"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  BookOpen,
  Users,
  Repeat,
  AlertTriangle,
  ArrowRight,
} from "lucide-react";
import Link from "next/link";
import { AppShell } from "@/components/layout/AppShell";
import { AnimatedCounter } from "@/components/ui/AnimatedCounter";
import { StatusPill } from "@/components/ui/Badge";
import { RowSkeleton } from "@/components/ui/Skeleton";
import { CoverThumb } from "@/components/books/CoverThumb";
import { useAuth } from "@/contexts/AuthContext";
import { listBooks, listLoans, listMembers, errorMessage } from "@/lib/api";
import type { Loan } from "@/lib/types";
import toast from "react-hot-toast";

const HeroScene = dynamic(() => import("@/components/three/HeroScene"), {
  ssr: false,
  loading: () => null,
});

interface Stats {
  books: number;
  members: number;
  active: number;
  overdue: number;
}

const cardConfig = [
  {
    key: "books" as const,
    label: "Total Books",
    icon: BookOpen,
    grad: "from-violet-500/25 to-violet-500/5",
    ring: "ring-violet-400/20",
    text: "text-violet-300",
    href: "/books",
  },
  {
    key: "members" as const,
    label: "Members",
    icon: Users,
    grad: "from-cyan-500/25 to-cyan-500/5",
    ring: "ring-cyan-400/20",
    text: "text-cyan-300",
    href: "/members",
  },
  {
    key: "active" as const,
    label: "Active Loans",
    icon: Repeat,
    grad: "from-emerald-500/25 to-emerald-500/5",
    ring: "ring-emerald-400/20",
    text: "text-emerald-300",
    href: "/loans",
  },
  {
    key: "overdue" as const,
    label: "Overdue",
    icon: AlertTriangle,
    grad: "from-rose-500/25 to-rose-500/5",
    ring: "ring-rose-400/20",
    text: "text-rose-300",
    href: "/loans",
  },
];

export default function DashboardPage() {
  return (
    <AppShell>
      <DashboardContent />
    </AppShell>
  );
}

function DashboardContent() {
  const { user } = useAuth();
  const [stats, setStats] = useState<Stats | null>(null);
  const [recent, setRecent] = useState<Loan[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const [books, members, active, overdue, recentLoans] =
          await Promise.all([
            listBooks({ page: 1, page_size: 1 }),
            listMembers({ page: 1, page_size: 1 }),
            listLoans({ page: 1, page_size: 1, status: "active" }),
            listLoans({ page: 1, page_size: 1, status: "overdue" }),
            listLoans({ page: 1, page_size: 6 }),
          ]);
        if (cancelled) return;
        setStats({
          books: books.total,
          members: members.total,
          active: active.total,
          overdue: overdue.total,
        });
        setRecent(recentLoans.items);
      } catch (err) {
        if (!cancelled) toast.error(errorMessage(err, "Failed to load dashboard"));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="space-y-8">
      {/* Hero */}
      <div className="glass relative h-64 overflow-hidden rounded-3xl sm:h-72">
        <div className="absolute inset-0">
          <HeroScene />
        </div>
        <div className="pointer-events-none absolute inset-0 flex flex-col justify-center bg-gradient-to-r from-ink-900/80 via-ink-900/30 to-transparent p-8 sm:p-10">
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-sm font-medium text-cyan-300"
          >
            Welcome back{user?.name ? `, ${user.name}` : ""}
          </motion.p>
          <motion.h1
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="mt-1 max-w-md text-3xl font-bold text-white sm:text-4xl"
          >
            Your library at a glance
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="mt-2 max-w-sm text-sm text-slate-300"
          >
            Manage your collection, members, and circulation in one place.
          </motion.p>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {cardConfig.map((c, i) => {
          const Icon = c.icon;
          return (
            <Link key={c.key} href={c.href}>
              <motion.div
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.08 }}
                whileHover={{ y: -4 }}
                className={`glass rounded-3xl p-5 ring-1 transition-shadow hover:shadow-glow ${c.ring}`}
              >
                <div
                  className={`mb-4 flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br ${c.grad}`}
                >
                  <Icon className={`h-5 w-5 ${c.text}`} />
                </div>
                <p className="text-3xl font-bold text-white">
                  {stats ? <AnimatedCounter value={stats[c.key]} /> : "—"}
                </p>
                <p className="mt-1 text-sm text-slate-400">{c.label}</p>
              </motion.div>
            </Link>
          );
        })}
      </div>

      {/* Recent loans */}
      <div>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">Recent loans</h2>
          <Link
            href="/loans"
            className="flex items-center gap-1 text-sm font-medium text-violet-300 hover:text-violet-200"
          >
            View all <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        {loading ? (
          <RowSkeleton count={5} />
        ) : recent.length === 0 ? (
          <div className="glass rounded-3xl px-6 py-10 text-center text-sm text-slate-400">
            No loans recorded yet.
          </div>
        ) : (
          <div className="space-y-3">
            {recent.map((loan, i) => (
              <motion.div
                key={loan.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                className="glass flex items-center justify-between rounded-2xl px-5 py-4"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <CoverThumb bookId={loan.book_id} title={loan.book_title ?? undefined} className="h-12 w-9" />
                  <div className="min-w-0">
                    <p className="truncate font-medium text-white">
                      {loan.book_title}
                    </p>
                    <p className="truncate text-sm text-slate-400">
                      {loan.member_name}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  {loan.fine_amount > 0 && (
                    <span className="text-sm font-medium text-rose-300">
                      ${loan.fine_amount.toFixed(2)}
                    </span>
                  )}
                  <StatusPill status={loan.status} />
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
