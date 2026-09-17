"use client";
import { useMemo } from "react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { Users, BookOpen, Network, ChevronRight, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { useStudents } from "@/hooks/useStudents";
import { useExams } from "@/hooks/useExams";
import { useInstituteConfig } from "@/hooks/useInstituteConfig";
import { buildBatchOverview } from "@/lib/hubUtils";
import { SUBJECT_COLORS, SUBJECTS } from "@/lib/chartUtils";

export default function HubPage() {
  const { students, loading: sl } = useStudents();
  const { exams,    loading: el } = useExams();
  const { config,   loading: cl, allDivisions } = useInstituteConfig();
  const router = useRouter();

  const isLoading = sl || el || cl;

  const overviews = useMemo(() => {
    if (!allDivisions.length) return [];
    return allDivisions.map(div => buildBatchOverview(div, students, exams));
  }, [allDivisions, students, exams]);

  // Group by standard
  const byStandard = useMemo(() => {
    const map = new Map<string, typeof overviews>();
    overviews.forEach(o => {
      if (!map.has(o.standard)) map.set(o.standard, []);
      map.get(o.standard)!.push(o);
    });
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [overviews]);

  if (isLoading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-2 border-brand-400/30 border-t-brand-400 rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="font-display text-xl font-bold text-[var(--text)] flex items-center gap-2">
          <Network className="w-5 h-5 text-brand-400" /> Hub
        </h1>
        <p className="text-xs text-[var(--muted)]">
          Batch overview — {allDivisions.length} divisions · {students.length} students · {exams.length} exams
        </p>
      </div>

      {byStandard.length === 0 ? (
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-12 text-center space-y-3">
          <Network className="w-10 h-10 text-[var(--muted)] mx-auto" />
          <p className="font-bold text-[var(--text)]">No standards configured</p>
          <p className="text-sm text-[var(--muted)]">Go to Settings → add standards and divisions first</p>
          <button onClick={() => router.push("/settings")}
            className="px-4 py-2 rounded-xl bg-brand-500 text-white text-sm hover:bg-brand-600 transition-colors">
            Open Settings
          </button>
        </div>
      ) : (
        byStandard.map(([standard, batches], si) => (
          <motion.div key={standard}
            initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: si * 0.08 }}
          >
            <h2 className="font-bold text-[var(--text)] mb-3 flex items-center gap-2">
              <span className="px-2.5 py-1 rounded-lg bg-brand-500/10 text-brand-400 text-sm font-mono border border-brand-500/20">
                Standard {standard}
              </span>
              <span className="text-xs text-[var(--muted)]">{batches.length} division{batches.length !== 1 ? "s" : ""}</span>
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {batches.map((b, bi) => (
                <motion.button
                  key={b.division}
                  onClick={() => router.push(`/hub/${b.division}`)}
                  className="text-left rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 hover:border-brand-400/40 hover:bg-brand-500/3 transition-all group"
                  initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: si * 0.08 + bi * 0.05 }}
                  whileHover={{ y: -2 }}
                  whileTap={{ scale: 0.99 }}
                >
                  {/* Header */}
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <p className="font-bold text-[var(--text)] text-xl font-mono">{b.division}</p>
                      <p className="text-xs text-[var(--muted)]">Division</p>
                    </div>
                    <ChevronRight className="w-5 h-5 text-[var(--muted)] group-hover:text-brand-400 transition-colors" />
                  </div>

                  {/* Stats row */}
                  <div className="grid grid-cols-2 gap-3 mb-4">
                    <div className="rounded-xl bg-[var(--bg)] p-3 border border-[var(--border)]">
                      <div className="flex items-center gap-1.5 mb-1">
                        <Users className="w-3.5 h-3.5 text-brand-400" />
                        <span className="text-[10px] text-[var(--muted)] uppercase tracking-wider">Students</span>
                      </div>
                      <p className="font-bold text-[var(--text)] text-xl"
                        style={{ fontVariantNumeric: "normal", fontFamily: "system-ui" }}>
                        {b.studentCount}
                      </p>
                    </div>
                    <div className="rounded-xl bg-[var(--bg)] p-3 border border-[var(--border)]">
                      <div className="flex items-center gap-1.5 mb-1">
                        <BookOpen className="w-3.5 h-3.5 text-purple-400" />
                        <span className="text-[10px] text-[var(--muted)] uppercase tracking-wider">Exams</span>
                      </div>
                      <p className="font-bold text-[var(--text)] text-xl"
                        style={{ fontVariantNumeric: "normal", fontFamily: "system-ui" }}>
                        {b.totalExams}
                      </p>
                    </div>
                  </div>

                  {/* Subject exam counts */}
                  <div className="flex gap-1.5 flex-wrap mb-3">
                    {SUBJECTS.map(sub => {
                      const count = b.subjectExams[sub];
                      if (!count) return null;
                      return (
                        <span key={sub}
                          className="px-2 py-0.5 rounded-full text-[10px] font-mono border"
                          style={{
                            color:       SUBJECT_COLORS[sub],
                            borderColor: `${SUBJECT_COLORS[sub]}30`,
                            background:  `${SUBJECT_COLORS[sub]}10`,
                          }}>
                          {sub.slice(0, 4)} ×{count}
                        </span>
                      );
                    })}
                  </div>

                  {/* Latest exam */}
                  {b.latestExam && (
                    <p className="text-xs text-[var(--muted)]">
                      Latest: <span className="text-[var(--text)]">{b.latestExam.name}</span>
                      {" · "}{b.latestExam.date}
                    </p>
                  )}
                </motion.button>
              ))}
            </div>
          </motion.div>
        ))
      )}
    </div>
  );
}