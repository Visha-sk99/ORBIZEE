"use client";
import { motion } from "framer-motion";
import Link from "next/link";
import { Student } from "@/types";
import { cn } from "@/lib/utils";
import Image from "next/image";
import { ExternalLink } from "lucide-react";

interface Props { student: Student; percentage?: number; rank?: number; delay?: number; }

export default function StudentCard({ student, percentage, rank, delay = 0 }: Props) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.3 }}
    >
      <Link href={`/students/${student.id}`}>
        <div className="glass dark:glass rounded-2xl p-4 border border-[var(--border)] hover:border-brand-400/40 transition-all duration-200 group cursor-pointer">
          <div className="flex items-center gap-3">
            {/* Avatar */}
            {student.profilePhoto ? (
              <Image src={student.profilePhoto} alt={student.fullName} width={44} height={44} className="rounded-full object-cover ring-2 ring-[var(--border)]" />
            ) : (
              <div className="w-11 h-11 rounded-full bg-gradient-to-br from-brand-500 to-purple-600 flex items-center justify-center text-white font-bold font-display text-sm flex-shrink-0">
                {student.fullName[0]}
              </div>
            )}

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <p className="font-display font-semibold text-[var(--text)] text-sm truncate">{student.fullName}</p>
                <ExternalLink className="w-3 h-3 text-[var(--muted)] opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
              </div>
              <p className="text-xs text-[var(--muted)]">
                Roll #{student.rollNumber} · {student.division}
              </p>
            </div>

            <div className="text-right flex-shrink-0">
              {percentage !== undefined && (
                <p className={cn(
                  "font-mono font-bold text-sm",
                  percentage >= 80 ? "text-emerald-400" : percentage >= 60 ? "text-yellow-400" : "text-red-400"
                )}>
                  {percentage}%
                </p>
              )}
              {rank && <p className="text-xs text-[var(--muted)]">#{rank}</p>}
            </div>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}