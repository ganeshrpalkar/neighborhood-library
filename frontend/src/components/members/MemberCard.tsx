"use client";

import { forwardRef } from "react";
import { Mail, Phone, Pencil, Trash2, BookMarked } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import type { Member } from "@/lib/types";
import { cn } from "@/lib/cn";

const GRAD = [
  "from-violet-500 to-fuchsia-500",
  "from-cyan-500 to-blue-500",
  "from-emerald-500 to-teal-500",
  "from-amber-500 to-orange-500",
  "from-pink-500 to-rose-500",
];

interface MemberCardProps {
  member: Member;
  index: number;
  onOpen: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

export const MemberCard = forwardRef<HTMLDivElement, MemberCardProps>(function MemberCard(
  { member, index, onOpen, onEdit, onDelete },
  ref
) {
  const grad = GRAD[member.id % GRAD.length];

  return (
    <Card ref={ref} index={index} variant="grid" glow="cyan">
      <div className="mb-4 flex items-start gap-4">
        <div
          className={cn(
            "flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br text-lg font-semibold text-white shadow-lg",
            grad
          )}
        >
          {member.name.charAt(0).toUpperCase()}
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="truncate font-semibold text-white">{member.name}</h3>
          <Badge
            className={cn(
              "mt-1 border",
              member.is_active
                ? "border-emerald-400/20 bg-emerald-500/15 text-emerald-300"
                : "border-slate-400/20 bg-slate-500/15 text-slate-300"
            )}
          >
            {member.is_active ? "Active" : "Inactive"}
          </Badge>
        </div>
      </div>

      <div className="mb-4 space-y-1.5 text-sm text-slate-400">
        <p className="flex items-center gap-2 truncate">
          <Mail className="h-3.5 w-3.5 shrink-0 text-slate-500" />
          {member.email}
        </p>
        {member.phone && (
          <p className="flex items-center gap-2 truncate">
            <Phone className="h-3.5 w-3.5 shrink-0 text-slate-500" />
            {member.phone}
          </p>
        )}
      </div>

      <div className="mt-auto flex items-center justify-between">
        <button
          onClick={onOpen}
          className="flex items-center gap-1.5 text-sm font-medium text-cyan-300 hover:text-cyan-200"
        >
          <BookMarked className="h-4 w-4" /> View loans
        </button>
        <div className="flex items-center gap-1">
          <button
            onClick={onEdit}
            title="Edit"
            className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-white/10 hover:text-white"
          >
            <Pencil className="h-4 w-4" />
          </button>
          <button
            onClick={onDelete}
            title="Delete"
            className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-rose-500/15 hover:text-rose-300"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>
    </Card>
  );
});

MemberCard.displayName = "MemberCard";
