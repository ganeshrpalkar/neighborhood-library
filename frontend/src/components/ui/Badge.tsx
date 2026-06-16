import { cn } from "@/lib/cn";
import type { LoanStatus } from "@/lib/types";

export function Badge({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium",
        className
      )}
    >
      {children}
    </span>
  );
}

const statusStyles: Record<LoanStatus, string> = {
  active: "bg-cyan-500/15 text-cyan-300 border border-cyan-400/20",
  returned: "bg-emerald-500/15 text-emerald-300 border border-emerald-400/20",
  overdue: "bg-rose-500/15 text-rose-300 border border-rose-400/20",
};

export function StatusPill({ status }: { status: LoanStatus }) {
  return (
    <Badge className={statusStyles[status]}>
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {status[0].toUpperCase() + status.slice(1)}
    </Badge>
  );
}
