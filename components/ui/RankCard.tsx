"use client";
import { motion } from "framer-motion";
import { Trophy, Medal } from "lucide-react";
import { Ranking } from "@/types";
import { cn } from "@/lib/utils";
import Image from "next/image";
import { useRouter } from "next/navigation";

interface Props { ranking: Ranking; delay?: number; }

const RANK_STYLE = [
  { bg: "from-yellow-500/20 to-yellow-600/5", border: "border-yellow-500/30", badge: "bg-yellow-500", icon: <Trophy className="w-3.5 h-3.5 text-white" /> },
  { bg: "from-slate-400/20 to-slate-500/5",   border: "border-slate-400/30",  badge: "bg-slate-400",  icon: <Medal  className="w-3.5 h-3.5 text-white" /> },
  { bg: "from-orange-500/20 to-orange-600/5", border: "border-orange-500/30", badge: "bg-orange-500", icon: <Medal  className="w-3.5 h-3.5 text-white" /> },
];

export default function RankCard({ ranking, delay = 0 }: Props) {
  const style  = RANK_STYLE[ranking.rank - 1] || {
    bg: "from-brand-500/10 to-transparent", border: "border-[var(--border)]",
    badge: "bg-brand-500", icon: null,
  };
  const router = useRouter();

  return (
    <motion.div
      onClick={() => router.push(`/students/${ranking.studentId}`)}
      className={cn(
        "relative rounded-2xl p-4 bg-gradient-to-br border cursor-pointer",
        style.bg, style.border,
        "hover:scale-[1.02] hover:shadow-lg transition-all duration-200"
      )}
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay, duration: 0.35 }}
      whileHover={{ y: -2 }}
      whileTap={{ scale: 0.98 }}
    >
      {/* Rank badge */}
      <div className={cn(
        "absolute -top-2 -right-2 w-7 h-7 rounded-full flex items-center justify-center shadow-lg",
        style.badge
      )}>
        {style.icon || <span className="text-white text-xs font-bold">#{ranking.rank}</span>}
      </div>

      <div className="flex items-center gap-3">
        {/* Avatar */}
        <div className="relative flex-shrink-0">
          {ranking.profilePhoto ? (
            <Image src={ranking.profilePhoto} alt={ranking.fullName}
              width={44} height={44}
              className="rounded-full object-cover ring-2 ring-[var(--border)]" />
          ) : (
            <div className="w-11 h-11 rounded-full bg-brand-500/20 flex items-center justify-center text-brand-400 font-bold font-display">
              {ranking.fullName[0]}
            </div>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <p className="font-display font-semibold text-[var(--text)] text-sm truncate">{ranking.fullName}</p>
          <p className="text-xs text-[var(--muted)]">Div {ranking.division} · Rank #{ranking.rank}</p>
        </div>

        <div className="text-right">
          <p className="font-mono font-bold text-lg text-[var(--text)]">{ranking.percentage}%</p>
        </div>
      </div>
    </motion.div>
  );
}