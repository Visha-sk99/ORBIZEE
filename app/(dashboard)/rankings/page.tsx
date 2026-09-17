"use client";
import { useMemo } from "react";
import { motion } from "framer-motion";
import { Trophy } from "lucide-react";
import Link from "next/link";
import { useStudents } from "@/hooks/useStudents";
import { useAllMarks } from "@/hooks/useMarks";
import { useInstituteConfig } from "@/hooks/useInstituteConfig";
import { computeRankings } from "@/services/rankingService";
import RankCard from "@/components/ui/RankCard";
import { getPercentageColor } from "@/lib/utils";

export default function RankingsPage() {
  const { students, loading } = useStudents();
  const { marks }             = useAllMarks();
  const { allDivisions }      = useInstituteConfig();

  const rankings = useMemo(() => computeRankings(students, marks), [students, marks]);

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="font-display text-xl font-bold text-[var(--text)]">Rankings</h1>
        <p className="text-xs text-[var(--muted)]">Live standings · click any student to view profile</p>
      </div>

      {/* Overall top 3 */}
      <div className="glass rounded-2xl p-5 border border-[var(--border)]">
        <div className="flex items-center gap-2 mb-4">
          <Trophy className="w-4 h-4 text-yellow-400" />
          <h2 className="font-display font-semibold text-[var(--text)]">Overall Top 3</h2>
        </div>
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[1,2,3].map(i => <div key={i} className="h-16 bg-[var(--border)] rounded-2xl animate-pulse" />)}
          </div>
        ) : rankings.slice(0, 3).length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {rankings.slice(0, 3).map((r, i) => (
              <RankCard key={r.studentId} ranking={r} delay={i * 0.08} />
            ))}
          </div>
        ) : (
          <p className="text-sm text-[var(--muted)] text-center py-4">No marks data yet.</p>
        )}
      </div>

      {/* Division-wise top 3 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {allDivisions.map(div => {
          const divRankings = rankings.filter(r => r.division === div).slice(0, 3);
          return (
            <motion.div key={div}
              className="glass rounded-2xl p-5 border border-[var(--border)]"
              initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
            >
              <h3 className="font-display font-semibold text-[var(--text)] mb-3 flex items-center gap-2">
                <span className="px-2 py-0.5 rounded-full bg-brand-500/10 text-brand-400 text-xs border border-brand-500/20 font-mono">
                  {div}
                </span>
                Top 3
              </h3>
              {divRankings.length > 0 ? (
                <div className="space-y-2">
                  {divRankings.map((r, i) => (
                    <Link key={r.studentId} href={`/students/${r.studentId}`}>
                      <div className="flex items-center gap-3 p-2.5 rounded-xl bg-[var(--bg)] border border-[var(--border)] hover:border-brand-400/40 hover:bg-brand-500/5 transition-all cursor-pointer group">
                        <span className="w-5 h-5 rounded-full bg-brand-500/10 text-brand-400 text-xs flex items-center justify-center font-bold">
                          #{i + 1}
                        </span>
                        <span className="flex-1 text-sm text-[var(--text)] font-medium group-hover:text-brand-400 transition-colors">
                          {r.fullName}
                        </span>
                        <span className={`font-mono font-bold text-sm ${getPercentageColor(r.percentage)}`}>
                          {r.percentage}%
                        </span>
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-[var(--muted)] py-4 text-center">No data for {div} yet.</p>
              )}
            </motion.div>
          );
        })}
      </div>

      {/* Full rankings table — all rows clickable */}
      <div className="glass rounded-2xl border border-[var(--border)] overflow-hidden">
        <div className="px-5 py-4 border-b border-[var(--border)]">
          <h2 className="font-display font-semibold text-[var(--text)]">Full Rankings</h2>
        </div>
        <div className="divide-y divide-[var(--border)]">
          {loading ? (
            [...Array(5)].map((_, i) => (
              <div key={i} className="h-12 animate-pulse bg-[var(--border)]/20" />
            ))
          ) : rankings.map((r, i) => (
            <Link key={r.studentId} href={`/students/${r.studentId}`}>
              <motion.div
                className="flex items-center gap-4 px-5 py-3 hover:bg-brand-500/5 hover:border-l-2 hover:border-brand-400 transition-all cursor-pointer group"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.015 }}
              >
                <span className="w-8 text-center font-mono text-xs text-[var(--muted)]">#{r.rank}</span>
                {/* Avatar */}
                {r.profilePhoto ? (
                  <img src={r.profilePhoto} alt={r.fullName}
                    className="w-7 h-7 rounded-full object-cover ring-1 ring-[var(--border)]" />
                ) : (
                  <div className="w-7 h-7 rounded-full bg-brand-500/20 flex items-center justify-center text-brand-400 text-xs font-bold flex-shrink-0">
                    {r.fullName[0]}
                  </div>
                )}
                <span className="flex-1 text-sm text-[var(--text)] font-medium group-hover:text-brand-400 transition-colors">
                  {r.fullName}
                </span>
                <span className="text-xs text-[var(--muted)] font-mono">{r.division}</span>
                <span className={`font-mono font-bold text-sm ${getPercentageColor(r.percentage)}`}>
                  {r.percentage}%
                </span>
              </motion.div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}