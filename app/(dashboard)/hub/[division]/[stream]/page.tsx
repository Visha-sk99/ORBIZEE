"use client";
import { use, useMemo } from "react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import {
  ArrowLeft, TrendingUp, TrendingDown, Minus, Calendar,
} from "lucide-react";
import { useStudents } from "@/hooks/useStudents";
import { useExams } from "@/hooks/useExams";
import { useAllMarks } from "@/hooks/useMarks";
import {
  buildStreamOverviews,
  buildSubjectGrowth,
  recentExamsForBatch,
} from "@/lib/hubUtils";
import { buildClassChartData, SUBJECT_COLORS, SUBJECTS } from "@/lib/chartUtils";
import SubjectFreqPolygon from "@/components/charts/SubjectFreqPolygon";
import { formatDate, slugToStream } from "@/lib/utils";
import type { Stream } from "@/types";

export default function HubStreamPage({
  params,
}: {
  params: Promise<{ division: string; stream: string }>;
}) {
  const { division, stream: streamSlug } = use(params);
  const stream = slugToStream(streamSlug) as Stream | null;
  const router = useRouter();

  const { students, loading: sl } = useStudents();
  const { exams, loading: el } = useExams();
  const { marks, loading: ml } = useAllMarks();

  const isLoading = sl || el || ml;

  const overview = useMemo(() => {
    if (!stream) return null;
    return buildStreamOverviews(division, students, exams).find(s => s.stream === stream) ?? null;
  }, [division, stream, students, exams]);

  const growthData = useMemo(() => {
    if (!stream) return [];
    return buildSubjectGrowth(division, exams, marks, stream);
  }, [division, stream, exams, marks]);

  const recentExams = useMemo(() => {
    if (!stream) return [];
    return recentExamsForBatch(division, exams, 5, stream);
  }, [division, stream, exams]);

  const streamStudentIds = useMemo(() => {
    if (!stream) return new Set<string>();
    return new Set(
      students
        .filter(s => s.division === division && s.stream === stream)
        .map(s => s.id)
    );
  }, [students, division, stream]);

  const chartData = useMemo(() => {
    if (!stream || !streamStudentIds.size) {
      return { Physics: [], Chemistry: [], Mathematics: [], Biology: [] };
    }
    const streamMarks = marks.filter(
      m => m.division === division && streamStudentIds.has(m.studentId)
    );
    const streamExams = exams.filter(
      e => e.division === division && e.stream === stream
    );
    if (!streamMarks.length || !streamExams.length) {
      return { Physics: [], Chemistry: [], Mathematics: [], Biology: [] };
    }
    return buildClassChartData(streamMarks, streamExams);
  }, [marks, exams, division, stream, streamStudentIds]);

  if (!stream) {
    return (
      <div className="p-8 text-center text-[var(--muted)]">
        Invalid stream.{" "}
        <button onClick={() => router.push(`/hub/${division}`)} className="text-brand-400 underline">
          Go back
        </button>
      </div>
    );
  }

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
        onClick={() => router.push(`/hub/${division}`)}
        className="inline-flex items-center gap-2 text-sm text-[var(--muted)] hover:text-[var(--text)] transition-colors"
      >
        <ArrowLeft className="w-4 h-4" /> Back to {division}
      </button>

      <motion.div
        className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="font-display text-2xl font-bold text-[var(--text)]">
              {division} · {stream}
            </h1>
            <p className="text-[var(--muted)] text-sm mt-1">Stream analytics</p>
          </div>
          <div className="flex gap-4">
            <div className="text-center">
              <p className="font-bold text-2xl text-[var(--text)]">{overview?.studentCount ?? 0}</p>
              <p className="text-xs text-[var(--muted)]">Students</p>
            </div>
            <div className="text-center">
              <p className="font-bold text-2xl text-[var(--text)]">{overview?.totalExams ?? 0}</p>
              <p className="text-xs text-[var(--muted)]">Exams</p>
            </div>
          </div>
        </div>

        <div className="flex gap-2 mt-4 flex-wrap">
          {SUBJECTS.map(sub => {
            const count = overview?.subjectExams[sub] ?? 0;
            return (
              <div
                key={sub}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-mono"
                style={{
                  color: count ? SUBJECT_COLORS[sub] : "var(--muted)",
                  borderColor: count ? `${SUBJECT_COLORS[sub]}30` : "var(--border)",
                  background: count ? `${SUBJECT_COLORS[sub]}10` : "transparent",
                  opacity: count ? 1 : 0.4,
                }}
              >
                <span className="font-bold">{sub}</span>
                <span>×{count}</span>
              </div>
            );
          })}
        </div>
      </motion.div>

      <motion.div
        className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
      >
        <h3 className="font-bold text-[var(--text)] mb-1">Subject Growth</h3>
        <p className="text-xs text-[var(--muted)] mb-4">
          Latest vs previous · {stream} only · excludes AB/ML/NA
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {growthData.map(g => (
            <div
              key={g.subject}
              className="rounded-xl border border-[var(--border)] bg-[var(--bg)] p-4 text-center"
            >
              <p className="text-xs font-bold mb-2" style={{ color: SUBJECT_COLORS[g.subject] }}>
                {g.subject}
              </p>
              {g.latest !== null ? (
                <>
                  <p className="font-bold text-lg text-[var(--text)] font-mono">{g.latest}%</p>
                  {g.growth !== null ? (
                    <div
                      className={`flex items-center justify-center gap-0.5 mt-1 text-xs font-mono font-bold ${
                        g.growth > 0
                          ? "text-emerald-400"
                          : g.growth < 0
                          ? "text-red-400"
                          : "text-[var(--muted)]"
                      }`}
                    >
                      {g.growth > 0 ? <TrendingUp className="w-3 h-3" /> :
                       g.growth < 0 ? <TrendingDown className="w-3 h-3" /> :
                       <Minus className="w-3 h-3" />}
                      {g.growth > 0 ? "+" : ""}{g.growth}%
                    </div>
                  ) : (
                    <p className="text-[10px] text-[var(--muted)] mt-1">Need 2+ exams</p>
                  )}
                  <p className="text-[10px] text-[var(--muted)] mt-0.5">
                    {g.examCount} exam{g.examCount !== 1 ? "s" : ""}
                  </p>
                </>
              ) : (
                <p className="text-xs text-[var(--muted)] mt-2">No data</p>
              )}
            </div>
          ))}
        </div>
      </motion.div>

      <motion.div
        className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <h3 className="font-bold text-[var(--text)] text-sm mb-1">
          Frequency Polygon — {division} · {stream}
        </h3>
        <p className="text-xs text-[var(--muted)] mb-4">
          Stream average % · independent lines per subject
        </p>
        <SubjectFreqPolygon data={chartData} mode="dashboard" height={280} />
      </motion.div>

      {recentExams.length > 0 && (
        <motion.div
          className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] overflow-hidden"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
        >
          <div className="px-5 py-4 border-b border-[var(--border)] flex items-center justify-between">
            <h3 className="font-bold text-[var(--text)] text-sm">Recent Exams</h3>
            <button
              onClick={() => router.push("/marks")}
              className="text-xs text-brand-400 hover:underline"
            >
              Enter Marks →
            </button>
          </div>
          <div className="divide-y divide-[var(--border)]">
            {recentExams.map(exam => (
              <div
                key={exam.id}
                className="px-5 py-3 flex items-center justify-between gap-4 hover:bg-[var(--border)]/20 transition-colors"
              >
                <div>
                  <p className="text-sm font-medium text-[var(--text)]">{exam.examName}</p>
                  <div className="flex items-center gap-1 text-xs text-[var(--muted)] mt-0.5">
                    <Calendar className="w-3 h-3" />
                    {formatDate(exam.date)}
                    {exam.day && ` · ${exam.day}`}
                  </div>
                </div>
                <div className="flex gap-1.5 flex-wrap justify-end">
                  {(exam.subjects || []).map((s, i) => (
                    <span
                      key={i}
                      className="px-2 py-0.5 rounded-full text-[10px] font-mono border"
                      style={{
                        color: SUBJECT_COLORS[s.subject as keyof typeof SUBJECT_COLORS] || "#6b7280",
                        borderColor: `${SUBJECT_COLORS[s.subject as keyof typeof SUBJECT_COLORS] || "#6b7280"}30`,
                        background: `${SUBJECT_COLORS[s.subject as keyof typeof SUBJECT_COLORS] || "#6b7280"}10`,
                      }}
                    >
                      {s.subject} · /{s.maximumMarks}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      )}
    </div>
  );
}