"use client";
import { use, useMemo } from "react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import {
  ArrowLeft, Users, BookOpen, ChevronRight, Network,
  TrendingUp, TrendingDown, Minus, Calendar, Percent,
} from "lucide-react";
import { useStudents } from "@/hooks/useStudents";
import { useExams } from "@/hooks/useExams";
import { useAllMarks } from "@/hooks/useMarks";
import {
  buildStreamOverviews, buildBatchOverview, buildSubjectGrowth,
} from "@/lib/hubUtils";
import {
  SUBJECT_COLORS, SUBJECTS, buildClassChartData,
} from "@/lib/chartUtils";
import { streamToSlug } from "@/lib/utils";
import SubjectFreqPolygon from "@/components/charts/SubjectFreqPolygon";

export default function HubDivisionPage({
  params,
}: {
  params: Promise<{ division: string }>;
}) {
  const { division } = use(params);
  const router = useRouter();
  const { students, loading: sl } = useStudents();
  const { exams, loading: el } = useExams();
  const { marks, loading: ml } = useAllMarks();

  const isLoading = sl || el || ml;

  // ── LEVEL 1: Overall division data — ALL streams combined ────────────
  // Filter ONLY by division. Never filter by stream in this section.
  const overview = useMemo(
    () => buildBatchOverview(division, students, exams),
    [division, students, exams]
  );

  const divisionMarks = useMemo(
    () => marks.filter(m => m.division === division),
    [marks, division]
  );

  const divisionExams = useMemo(
    () => exams.filter(e => e.division === division),
    [exams, division]
  );

  const overallAverage = useMemo(() => {
    const valid = divisionMarks.filter(
      m => m.status === "present" && m.obtainedMarks !== null && m.maximumMarks > 0
    );
    if (!valid.length) return null;
    const totalObtained = valid.reduce((s, m) => s + (m.obtainedMarks ?? 0), 0);
    const totalMax = valid.reduce((s, m) => s + m.maximumMarks, 0);
    return Math.round((totalObtained / totalMax) * 1000) / 10;
  }, [divisionMarks]);

  // No stream argument → overall growth across all streams combined
  const overallGrowth = useMemo(
    () => buildSubjectGrowth(division, exams, marks),
    [division, exams, marks]
  );

  const overallChartData = useMemo(
    () => buildClassChartData(divisionMarks, divisionExams),
    [divisionMarks, divisionExams]
  );

  // ── LEVEL 2: Stream-wise breakdown (unchanged existing logic) ─────────
  const streamOverviews = useMemo(
    () => buildStreamOverviews(division, students, exams),
    [division, students, exams]
  );

  const activeStreams = streamOverviews.filter(
    s => s.studentCount > 0 || s.totalExams > 0
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-brand-400/30 border-t-brand-400 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-5 animate-fade-in max-w-5xl mx-auto">
      <button
        onClick={() => router.push("/hub")}
        className="inline-flex items-center gap-2 text-sm text-[var(--muted)] hover:text-[var(--text)] transition-colors"
      >
        <ArrowLeft className="w-4 h-4" /> Back to Hub
      </button>

      <div>
        <h1 className="font-display text-2xl font-bold text-[var(--text)] font-mono">
          {division}
        </h1>
        <p className="text-xs text-[var(--muted)] mt-1">
          Overall division performance · {overview.studentCount} total students
        </p>
      </div>

      {/* ── LEVEL 1: Overall stats ─────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4">
          <div className="flex items-center gap-1.5 mb-1.5">
            <Users className="w-3.5 h-3.5 text-brand-400" />
            <span className="text-[10px] text-[var(--muted)] uppercase tracking-wider">Students</span>
          </div>
          <p className="font-bold text-[var(--text)] text-2xl">{overview.studentCount}</p>
        </div>

        <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4">
          <div className="flex items-center gap-1.5 mb-1.5">
            <BookOpen className="w-3.5 h-3.5 text-purple-400" />
            <span className="text-[10px] text-[var(--muted)] uppercase tracking-wider">Exams</span>
          </div>
          <p className="font-bold text-[var(--text)] text-2xl">{overview.totalExams}</p>
        </div>

        <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4">
          <div className="flex items-center gap-1.5 mb-1.5">
            <Percent className="w-3.5 h-3.5 text-emerald-400" />
            <span className="text-[10px] text-[var(--muted)] uppercase tracking-wider">Overall Avg</span>
          </div>
          <p className="font-bold text-[var(--text)] text-2xl">
            {overallAverage !== null ? `${overallAverage}%` : "—"}
          </p>
        </div>

        <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4">
          <div className="flex items-center gap-1.5 mb-1.5">
            <Calendar className="w-3.5 h-3.5 text-amber-400" />
            <span className="text-[10px] text-[var(--muted)] uppercase tracking-wider">Latest Exam</span>
          </div>
          {overview.latestExam ? (
            <>
              <p className="font-bold text-[var(--text)] text-sm truncate">{overview.latestExam.name}</p>
              <p className="text-[10px] text-[var(--muted)] mt-0.5">{overview.latestExam.date}</p>
            </>
          ) : (
            <p className="font-bold text-[var(--muted)] text-sm">—</p>
          )}
        </div>
      </div>

      {/* Subject-wise exam counts for the whole division (all streams) */}
      <div className="flex gap-1.5 flex-wrap">
        {SUBJECTS.map(sub => {
          const count = overview.subjectExams[sub];
          if (!count) return null;
          return (
            <span
              key={sub}
              className="px-2.5 py-1 rounded-full text-[11px] font-mono border"
              style={{
                color: SUBJECT_COLORS[sub],
                borderColor: `${SUBJECT_COLORS[sub]}30`,
                background: `${SUBJECT_COLORS[sub]}10`,
              }}
            >
              {sub} ×{count}
            </span>
          );
        })}
      </div>

      {/* ── LEVEL 1: Subject growth (all streams combined) ──────────────── */}
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 space-y-4">
        <div>
          <p className="font-bold text-[var(--text)]">Subject Growth</p>
          <p className="text-xs text-[var(--muted)] mt-0.5">
            Latest vs previous · all streams combined · excludes AB/ML/NA
          </p>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {overallGrowth.map(g => (
            <div
              key={g.subject}
              className="rounded-xl border border-[var(--border)] bg-[var(--bg)] p-4 text-center space-y-1.5"
            >
              <p className="text-xs font-bold" style={{ color: SUBJECT_COLORS[g.subject] }}>
                {g.subject}
              </p>
              {g.growth !== null ? (
                <div
                  className={`flex items-center justify-center gap-1 font-mono font-bold text-lg ${
                    g.growth > 0
                      ? "text-emerald-400"
                      : g.growth < 0
                      ? "text-red-400"
                      : "text-[var(--muted)]"
                  }`}
                >
                  {g.growth > 0 ? (
                    <TrendingUp className="w-4 h-4" />
                  ) : g.growth < 0 ? (
                    <TrendingDown className="w-4 h-4" />
                  ) : (
                    <Minus className="w-4 h-4" />
                  )}
                  {g.growth > 0 ? "+" : ""}
                  {g.growth}%
                </div>
              ) : g.latest !== null ? (
                <p className="font-mono font-bold text-lg text-[var(--text)]">{g.latest}%</p>
              ) : (
                <p className="text-sm text-[var(--muted)]">No data</p>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* ── LEVEL 1: Overall frequency polygon ───────────────────────────── */}
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 space-y-1">
        <p className="font-bold text-[var(--text)]">Frequency Polygon — {division} Overall</p>
        <p className="text-xs text-[var(--muted)] mb-2">
          All streams combined · independent lines per subject
        </p>
        <SubjectFreqPolygon data={overallChartData} mode="dashboard" />
      </div>

      {/* ── LEVEL 2: Stream-wise breakdown ────────────────────────────────── */}
      <div className="pt-2">
        <p className="font-bold text-[var(--text)] mb-3">Stream-wise Breakdown</p>

        {activeStreams.length === 0 ? (
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-12 text-center space-y-3">
            <Network className="w-10 h-10 text-[var(--muted)] mx-auto" />
            <p className="font-bold text-[var(--text)]">No streams assigned yet</p>
            <p className="text-sm text-[var(--muted)]">
              Assign streams to students or create stream-specific exams.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {activeStreams.map((s, i) => (
              <motion.button
                key={s.stream}
                onClick={() => router.push(`/hub/${division}/${streamToSlug(s.stream)}`)}
                className="text-left rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 hover:border-brand-400/40 transition-all group"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.06 }}
                whileHover={{ y: -2 }}
              >
                <div className="flex items-center justify-between mb-4">
                  <p className="font-bold text-[var(--text)] text-lg">{s.stream}</p>
                  <ChevronRight className="w-5 h-5 text-[var(--muted)] group-hover:text-brand-400" />
                </div>

                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div className="rounded-xl bg-[var(--bg)] p-3 border border-[var(--border)]">
                    <div className="flex items-center gap-1.5 mb-1">
                      <Users className="w-3.5 h-3.5 text-brand-400" />
                      <span className="text-[10px] text-[var(--muted)] uppercase">Students</span>
                    </div>
                    <p className="font-bold text-[var(--text)] text-xl">{s.studentCount}</p>
                  </div>
                  <div className="rounded-xl bg-[var(--bg)] p-3 border border-[var(--border)]">
                    <div className="flex items-center gap-1.5 mb-1">
                      <BookOpen className="w-3.5 h-3.5 text-purple-400" />
                      <span className="text-[10px] text-[var(--muted)] uppercase">Exams</span>
                    </div>
                    <p className="font-bold text-[var(--text)] text-xl">{s.totalExams}</p>
                  </div>
                </div>

                <div className="flex gap-1.5 flex-wrap mb-3">
                  {SUBJECTS.map(sub => {
                    const count = s.subjectExams[sub];
                    if (!count) return null;
                    return (
                      <span
                        key={sub}
                        className="px-2 py-0.5 rounded-full text-[10px] font-mono border"
                        style={{
                          color: SUBJECT_COLORS[sub],
                          borderColor: `${SUBJECT_COLORS[sub]}30`,
                          background: `${SUBJECT_COLORS[sub]}10`,
                        }}
                      >
                        {sub.slice(0, 4)} ×{count}
                      </span>
                    );
                  })}
                </div>

                {s.latestExam && (
                  <p className="text-xs text-[var(--muted)]">
                    Latest: <span className="text-[var(--text)]">{s.latestExam.name}</span>
                    {" · "}
                    {s.latestExam.date}
                  </p>
                )}
              </motion.button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
