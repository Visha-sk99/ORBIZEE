"use client";
import { useMemo, useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Users, BookOpen, BarChart3, Star, TrendingUp, TrendingDown, Minus } from "lucide-react";
import {
  ResponsiveContainer, RadarChart, PolarGrid,
  PolarAngleAxis, Radar, Tooltip,
} from "recharts";
import StatsCard from "@/components/ui/StatsCard";
import RankCard from "@/components/ui/RankCard";
import SubjectFreqPolygon from "@/components/charts/SubjectFreqPolygon";
import { useStudents } from "@/hooks/useStudents";
import { useExams } from "@/hooks/useExams";
import { useAllMarks } from "@/hooks/useMarks";
import { computeRankings } from "@/services/rankingService";
import { calcPercentage } from "@/lib/utils";
import { buildClassChartData } from "@/lib/chartUtils";
import { useTheme } from "@/context/ThemeContext";

const SUBJECTS = ["Physics", "Chemistry", "Mathematics", "Biology"] as const;

function Skeleton({ className }: { className?: string }) {
  return <div className={`rounded-2xl bg-[var(--border)] animate-pulse ${className}`} />;
}

export default function DashboardPage() {
  const { students, loading: sl } = useStudents();
  const { exams,    loading: el } = useExams();
  const { marks,    loading: ml } = useAllMarks();
  const { theme } = useTheme();

  const [chartsReady, setChartsReady] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setChartsReady(true), 50);
    return () => clearTimeout(t);
  }, []);

  const isLoading = sl || el || ml;
  const gridColor = theme === "dark" ? "#1f2937" : "#e5e7eb";
  const textColor = theme === "dark" ? "#6b7280" : "#9ca3af";

  const rankings = useMemo(() => {
    if (!marks.length || !students.length) return [];
    return computeRankings(students, marks);
  }, [students, marks]);

  const top3 = useMemo(() => rankings.slice(0, 3), [rankings]);

  const avgPercentage = useMemo(() => {
    if (!rankings.length) return 0;
    return Math.round(rankings.reduce((s, r) => s + r.percentage, 0) / rankings.length * 10) / 10;
  }, [rankings]);

  // ── CLASS frequency polygon — properly separated by subject ──────────────
  const classChartData = useMemo(() => {
    if (!marks.length || !exams.length) return { Physics: [], Chemistry: [], Mathematics: [], Biology: [] };
    return buildClassChartData(marks, exams);
  }, [marks, exams]);

  // ── Last 3 exams summary ──────────────────────────────────────────────────
  const last3Exams = useMemo(() =>
    [...exams]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 3)
      .reverse(),
    [exams]
  );

  const examSummaries = useMemo(() => {
    return last3Exams.map((exam, idx) => {
      const em  = marks.filter(m => m.examId === exam.id && m.status === "present" && m.obtainedMarks !== null);
      const tot = em.reduce((s, m) => s + m.maximumMarks, 0);
      const obt = em.reduce((s, m) => s + (m.obtainedMarks ?? 0), 0);
      const avg = calcPercentage(obt, tot);
      const prev = last3Exams[idx - 1];
      let trend = 0;
      if (prev) {
        const pm  = marks.filter(m => m.examId === prev.id && m.status === "present");
        const pt  = pm.reduce((s, m) => s + m.maximumMarks, 0);
        const po  = pm.reduce((s, m) => s + (m.obtainedMarks ?? 0), 0);
        trend = Math.round((avg - calcPercentage(po, pt)) * 10) / 10;
      }
      return { exam, avg, trend };
    });
  }, [last3Exams, marks]);

  // Subject radar
  const subjectRadar = useMemo(() =>
    SUBJECTS.map(subject => {
      const sm = marks.filter(m => m.subject === subject && m.status === "present" && m.obtainedMarks !== null);
      const t  = sm.reduce((s, m) => s + m.maximumMarks, 0);
      const o  = sm.reduce((s, m) => s + (m.obtainedMarks ?? 0), 0);
      return { subject, value: calcPercentage(o, t) };
    }), [marks]);

  return (
    <div className="space-y-5 animate-fade-in">

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {isLoading ? (
          <>{[0,1,2,3].map(i => <Skeleton key={i} className="h-28" />)}</>
        ) : (
          <>
            <StatsCard title="Total Students" value={students.length}     icon={Users}    color="blue"   delay={0}    />
            <StatsCard title="Total Exams"    value={exams.length}        icon={BookOpen} color="purple" delay={0.05} />
            <StatsCard title="Average Score"  value={`${avgPercentage}%`} icon={BarChart3} color="green" delay={0.1}  />
            <StatsCard title="Best Performer"
              value={top3[0]?.fullName.split(" ")[0] || "—"}
              icon={Star} color="yellow" delay={0.15} />
          </>
        )}
      </div>

      {/* Last 3 exam summaries */}
      {!isLoading && examSummaries.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {examSummaries.map(({ exam, avg, trend }, i) => (
            <motion.div key={exam.id}
              className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4"
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}>
              <div className="flex items-start justify-between mb-2">
                <div>
                  <p className="text-[10px] text-[var(--muted)] font-mono uppercase tracking-wider">Exam {i + 1}</p>
                  <p className="font-bold text-[var(--text)] text-sm leading-tight">{exam.examName}</p>
                </div>
                {i === 0 ? (
                  <span className="text-[10px] text-[var(--muted)] font-mono">Base</span>
                ) : (
                  <span className={`flex items-center gap-0.5 text-xs font-mono font-bold ${
                    trend > 0 ? "text-emerald-400" : trend < 0 ? "text-red-400" : "text-[var(--muted)]"
                  }`}>
                    {trend > 0 ? <TrendingUp className="w-3 h-3" /> : trend < 0 ? <TrendingDown className="w-3 h-3" /> : <Minus className="w-3 h-3" />}
                    {trend > 0 ? "+" : ""}{trend !== 0 ? `${trend}%` : "—"}
                  </span>
                )}
              </div>
              <p className="font-bold leading-none mt-3" style={{
                fontSize: 30,
                color: avg >= 80 ? "#10b981" : avg >= 60 ? "#f59e0b" : avg > 0 ? "#ef4444" : "#6b7280",
                fontVariantNumeric: "normal", fontFamily: "system-ui",
              }}>
                {avg > 0 ? `${avg}%` : "No data"}
              </p>
              <p className="text-xs text-[var(--muted)] mt-1">{exam.date}</p>
            </motion.div>
          ))}
        </div>
      )}

      {/* Charts */}
      {chartsReady && (
        <>
          {/* ── Subject Frequency Polygon — properly separated ── */}
          <motion.div
            className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5"
            initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          >
            <div className="mb-4">
              <h3 className="font-bold text-[var(--text)] text-sm">
                Frequency Polygon — Subject Progress
              </h3>
              <p className="text-xs text-[var(--muted)]">
                Class average % per subject across exams — each subject is an independent line
              </p>
            </div>
            <SubjectFreqPolygon data={classChartData} mode="dashboard" height={280} />
          </motion.div>

          {/* Radar + Top Rankers */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <motion.div
              className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5"
              initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
            >
              <h3 className="font-bold text-[var(--text)] text-sm mb-4">Subject-wise Performance</h3>
              <ResponsiveContainer width="100%" height={220}>
                <RadarChart data={subjectRadar}>
                  <PolarGrid stroke={gridColor} />
                  <PolarAngleAxis dataKey="subject" tick={{ fill: textColor, fontSize: 11 }} />
                  <Radar name="Score" dataKey="value" stroke="#6b8eff" fill="#6b8eff" fillOpacity={0.15} strokeWidth={2} />
                  <Tooltip
                    contentStyle={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 12, fontSize: 12 }}
                    formatter={(v: number) => [`${v}%`, "Average"]}
                  />
                </RadarChart>
              </ResponsiveContainer>
            </motion.div>

            <motion.div
              className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5"
              initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-[var(--text)] text-sm">Top Rankers</h3>
                <span className="text-xs text-[var(--muted)] font-mono">Overall</span>
              </div>
              {sl ? (
                <div className="space-y-3">{[1,2,3].map(i => <Skeleton key={i} className="h-16" />)}</div>
              ) : top3.length > 0 ? (
                <div className="grid grid-cols-1 gap-3">
                  {top3.map((r, i) => <RankCard key={r.studentId} ranking={r} delay={i * 0.06} />)}
                </div>
              ) : (
                <div className="h-40 flex items-center justify-center">
                  <p className="text-sm text-[var(--muted)] text-center">No marks data yet.</p>
                </div>
              )}
            </motion.div>
          </div>
        </>
      )}
    </div>
  );
}