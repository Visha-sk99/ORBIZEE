"use client";
import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus, Trash2, Calendar, ChevronRight,
  X, Save, RefreshCw, CheckCircle2,
} from "lucide-react";
import { useExams } from "@/hooks/useExams";
import { useAuth } from "@/hooks/useAuth";
import { useInstituteConfig } from "@/hooks/useInstituteConfig";
import { addExam, deleteExam } from "@/services/examService";
import { formatDate, STREAMS } from "@/lib/utils";
import { useRouter } from "next/navigation";
import type { Exam, Subject, PaperType, SubjectConfig, Stream } from "@/types";

const SUBJECTS: Subject[] = ["Physics", "Chemistry", "Mathematics", "Biology"];
const PAPER_TYPES: PaperType[] = ["Theory", "Entrance", "Practical", "MCQ", "Unit Test", "Assignment"];
const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const SUBJECT_COLORS: Record<string, string> = {
  Physics: "#6b8eff",
  Chemistry: "#a855f7",
  Mathematics: "#10b981",
  Biology: "#f59e0b",
};

function getDayFromDate(d: string) {
  if (!d) return "";
  return DAYS[new Date(d).getDay()];
}

const DEFAULT_SUB: SubjectConfig = {
  subject: "Physics",
  topic: "",
  paperType: "Theory",
  maximumMarks: 100,
};

/** Build ordered list of subject+topic occurrences across all exams (oldest → newest) */
function buildTopicOccurrenceMap(exams: Exam[]) {
  const sorted = [...exams].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );
  // key = "Physics||Electrostatics" → exam ids in order
  const map = new Map<string, string[]>();
  sorted.forEach(exam => {
    (exam.subjects || []).forEach(s => {
      const topic = (s.topic || "").trim();
      if (!topic) return;
      const key = `${s.subject}||${topic.toLowerCase()}`;
      const list = map.get(key) || [];
      list.push(exam.id);
      map.set(key, list);
    });
  });
  return map;
}

function toRoman(n: number): string {
  const romans = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X",
    "XI", "XII", "XIII", "XIV", "XV", "XVI", "XVII", "XVIII", "XIX", "XX"];
  return romans[n - 1] || String(n);
}

/** Display label: "Electrostatics II" if this subject+topic appeared before */
function topicDisplayLabel(
  subject: string,
  topic: string,
  examId: string,
  occurrenceMap: Map<string, string[]>
): string {
  const t = (topic || "").trim();
  if (!t) return "";
  const key = `${subject}||${t.toLowerCase()}`;
  const list = occurrenceMap.get(key) || [];
  if (list.length <= 1) return t;
  const idx = list.indexOf(examId);
  if (idx < 0) return t;
  return `${t} ${toRoman(idx + 1)}`;
}

export default function ExamsPage() {
  const { exams, loading, refresh } = useExams();
  const { isAdmin } = useAuth();
  const { allDivisions, allStandards } = useInstituteConfig();
  const router = useRouter();

  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const [examName, setExamName] = useState("");
  const [division, setDivision] = useState("");
  const [stream, setStream] = useState<Stream | "">("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [subjects, setSubjects] = useState<SubjectConfig[]>([{ ...DEFAULT_SUB }]);

  const day = getDayFromDate(date);

  // Existing topics per subject (for dropdown)
  const topicsBySubject = useMemo(() => {
    const map: Record<string, string[]> = {};
    exams.forEach(exam => {
      (exam.subjects || []).forEach(s => {
        const t = (s.topic || "").trim();
        if (!t) return;
        if (!map[s.subject]) map[s.subject] = [];
        if (!map[s.subject].some(x => x.toLowerCase() === t.toLowerCase())) {
          map[s.subject].push(t);
        }
      });
    });
    // sort alphabetically
    Object.keys(map).forEach(k => map[k].sort((a, b) => a.localeCompare(b)));
    return map;
  }, [exams]);

  const occurrenceMap = useMemo(() => buildTopicOccurrenceMap(exams), [exams]);

  const resetForm = () => {
    setExamName("");
    setDivision(allDivisions[0] || "");
    setStream("");
    setDate(new Date().toISOString().split("T")[0]);
    setSubjects([{ ...DEFAULT_SUB }]);
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Delete "${name}" and all its marks? This cannot be undone.`)) return;
    await deleteExam(id);
    refresh();
  };

  const addSubject = () =>
    setSubjects(s => [
      ...s,
      { ...DEFAULT_SUB, subject: SUBJECTS[s.length % SUBJECTS.length] },
    ]);

  const removeSubject = (i: number) =>
    setSubjects(s => s.filter((_, idx) => idx !== i));

  const updateSub = <K extends keyof SubjectConfig>(
    i: number,
    key: K,
    val: SubjectConfig[K]
  ) =>
    setSubjects(s => {
      const n = [...s];
      n[i] = { ...n[i], [key]: val };
      // clear topic when subject changes so dropdown resets cleanly
      if (key === "subject") n[i].topic = "";
      return n;
    });

  const handleSave = async () => {
    // Stream is now OPTIONAL — leaving it unselected means "all streams" for this exam
    if (!examName.trim() || !division || !subjects.length) return;
    if (subjects.some(s => !s.maximumMarks || s.maximumMarks <= 0)) {
      alert("All subjects must have maximum marks > 0.");
      return;
    }
    setSaving(true);
    try {
      const std = allStandards.find(s => division.startsWith(s)) || "";
        await addExam({
          examName: examName.trim(),
          class: std as Exam["class"],
          division: division as Exam["division"],
          ...(stream ? { stream: stream as Stream } : {}),
          date,
          day,
          subjects: subjects.map(s => ({
            ...s,
            topic: (s.topic || "").trim(),
          })),
        });
      await refresh();
      setSaved(true);
      setTimeout(() => {
        setSaved(false);
        setShowForm(false);
        resetForm();
      }, 1200);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-xl font-bold text-[var(--text)]">Exams</h1>
          <p className="text-xs text-[var(--muted)]">{exams.length} total</p>
        </div>
        {isAdmin && !showForm && (
          <button
            onClick={() => {
              resetForm();
              setShowForm(true);
            }}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-brand-500 text-white text-sm font-medium hover:bg-brand-600 transition-colors shadow-md shadow-brand-500/20"
          >
            <Plus className="w-4 h-4" /> Add Exam
          </button>
        )}
      </div>

      <AnimatePresence>
        {showForm && (
          <motion.div
            className="rounded-2xl border border-brand-500/30 bg-[var(--surface)] p-5 space-y-5"
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
          >
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-[var(--text)]">📋 Create New Exam</h2>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="p-1.5 rounded-lg text-[var(--muted)] hover:bg-[var(--border)] transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="rounded-xl bg-[var(--bg)] border border-[var(--border)] p-4 space-y-3">
              <p className="text-xs text-[var(--muted)] uppercase tracking-wider font-mono">
                Exam Details
              </p>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                <div className="lg:col-span-2">
                  <label className="text-xs text-[var(--muted)] mb-1 block">Exam Name *</label>
                  <input
                    value={examName}
                    onChange={e => setExamName(e.target.value)}
                    placeholder="e.g. Weekly Test 1, Unit Test"
                    className="w-full px-3 py-2 rounded-xl bg-[var(--surface)] border border-[var(--border)] text-sm text-[var(--text)] focus:outline-none focus:border-brand-400/60"
                  />
                </div>

                <div>
                  <label className="text-xs text-[var(--muted)] mb-1 block">Division *</label>
                  <select
                    value={division}
                    onChange={e => setDivision(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-[var(--surface)] border border-[var(--border)] text-sm text-[var(--text)] focus:outline-none"
                  >
                    <option value="">Select division…</option>
                    {allDivisions.map(d => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs text-[var(--muted)] mb-1 block">
                    Stream <span className="text-[var(--muted)] normal-case">(optional)</span>
                  </label>
                  <select
                    value={stream}
                    onChange={e => setStream(e.target.value as Stream | "")}
                    className="w-full px-3 py-2 rounded-xl bg-[var(--surface)] border border-[var(--border)] text-sm text-[var(--text)] focus:outline-none focus:border-brand-400/60"
                  >
                    <option value="">All Streams (whole division)</option>
                    {STREAMS.map(s => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                  <p className="text-[10px] text-[var(--muted)] mt-1">
                    Leave unselected to include every student in this division, regardless of stream.
                  </p>
                </div>

                <div className="lg:col-span-2">
                  <label className="text-xs text-[var(--muted)] mb-1 block">Date *</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="date"
                      value={date}
                      onChange={e => setDate(e.target.value)}
                      className="flex-1 px-3 py-2 rounded-xl bg-[var(--surface)] border border-[var(--border)] text-sm text-[var(--text)] focus:outline-none"
                    />
                    {day && (
                      <span className="px-2.5 py-2 rounded-xl bg-brand-500/10 border border-brand-500/20 text-brand-400 text-xs font-mono whitespace-nowrap">
                        {day}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-[var(--text)] uppercase tracking-wider">
                    Subject Configuration
                  </p>
                  <p className="text-xs text-[var(--muted)] mt-0.5">
                    Max marks entered once — auto-applies to all students
                  </p>
                </div>
                <button
                  type="button"
                  onClick={addSubject}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-brand-500/10 border border-brand-500/20 text-brand-400 text-xs hover:bg-brand-500/20 transition-colors"
                >
                  <Plus className="w-3 h-3" /> Add Subject
                </button>
              </div>

              {subjects.map((sub, i) => {
                const existingTopics = topicsBySubject[sub.subject] || [];
                const datalistId = `topic-list-${i}`;

                return (
                  <motion.div
                    key={i}
                    className="rounded-xl border border-[var(--border)] bg-[var(--bg)] overflow-hidden"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                  >
                    <div
                      className="flex items-center justify-between px-4 py-2 border-b border-[var(--border)]"
                      style={{
                        borderLeftColor: SUBJECT_COLORS[sub.subject],
                        borderLeftWidth: 3,
                      }}
                    >
                      <span
                        className="text-xs font-bold"
                        style={{ color: SUBJECT_COLORS[sub.subject] }}
                      >
                        Subject {i + 1}
                      </span>
                      {subjects.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeSubject(i)}
                          className="p-1 rounded-lg text-red-400 hover:bg-red-500/10 transition-colors"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 p-4">
                      <div>
                        <label className="text-[10px] text-[var(--muted)] mb-1 block uppercase tracking-wider">
                          Subject
                        </label>
                        <select
                          value={sub.subject}
                          onChange={e =>
                            updateSub(i, "subject", e.target.value as Subject)
                          }
                          className="w-full px-2 py-2 rounded-xl bg-[var(--surface)] border border-[var(--border)] text-sm text-[var(--text)] focus:outline-none"
                        >
                          {SUBJECTS.map(s => (
                            <option key={s} value={s}>{s}</option>
                          ))}
                        </select>
                      </div>

                      {/* Topic: free text + dropdown of existing topics for this subject */}
                      <div>
                        <label className="text-[10px] text-[var(--muted)] mb-1 block uppercase tracking-wider">
                          Topic
                          {existingTopics.length > 0 && (
                            <span className="text-brand-400 ml-1 normal-case">
                              · {existingTopics.length} existing
                            </span>
                          )}
                        </label>
                        <input
                          list={datalistId}
                          value={sub.topic}
                          onChange={e => updateSub(i, "topic", e.target.value)}
                          placeholder={
                            existingTopics.length
                              ? "Type or pick existing topic…"
                              : "e.g. Electrostatics"
                          }
                          className="w-full px-2 py-2 rounded-xl bg-[var(--surface)] border border-[var(--border)] text-sm text-[var(--text)] focus:outline-none focus:border-brand-400/60"
                        />
                        <datalist id={datalistId}>
                          {existingTopics.map(t => (
                            <option key={t} value={t} />
                          ))}
                        </datalist>
                        {existingTopics.length > 0 && (
                          <select
                            value=""
                            onChange={e => {
                              if (e.target.value) updateSub(i, "topic", e.target.value);
                            }}
                            className="mt-1.5 w-full px-2 py-1.5 rounded-lg bg-[var(--surface)] border border-brand-500/30 text-[11px] text-brand-400 focus:outline-none"
                          >
                            <option value="">↓ Select existing topic</option>
                            {existingTopics.map(t => (
                              <option key={t} value={t}>{t}</option>
                            ))}
                          </select>
                        )}
                      </div>

                      <div>
                        <label className="text-[10px] text-[var(--muted)] mb-1 block uppercase tracking-wider">
                          Paper Type
                        </label>
                        <select
                          value={sub.paperType}
                          onChange={e =>
                            updateSub(i, "paperType", e.target.value as PaperType)
                          }
                          className="w-full px-2 py-2 rounded-xl bg-[var(--surface)] border border-[var(--border)] text-sm text-[var(--text)] focus:outline-none"
                        >
                          {PAPER_TYPES.map(p => (
                            <option key={p} value={p}>{p}</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="text-[10px] mb-1 block uppercase tracking-wider font-bold text-emerald-400">
                          Max Marks *
                        </label>
                        <input
                          type="number"
                          min={1}
                          value={sub.maximumMarks}
                          onChange={e =>
                            updateSub(i, "maximumMarks", Number(e.target.value))
                          }
                          className="w-full px-2 py-2 rounded-xl bg-[var(--surface)] border-2 border-emerald-500/40 text-sm text-emerald-400 font-mono font-bold focus:outline-none focus:border-emerald-500/80 text-center"
                        />
                      </div>
                    </div>

                    <div className="px-4 py-2 bg-brand-500/5 border-t border-[var(--border)]">
                      <p className="text-[10px] text-[var(--muted)] font-mono">
                        Preview:{" "}
                        <span
                          className="font-bold"
                          style={{ color: SUBJECT_COLORS[sub.subject] }}
                        >
                          {sub.subject}
                        </span>
                        {sub.topic && (
                          <span className="text-[var(--muted)]"> · {sub.topic}</span>
                        )}
                        <span className="text-[var(--muted)]"> · {sub.paperType}</span>
                        <span className="text-emerald-400 font-bold">
                          {" "}· /{sub.maximumMarks}
                        </span>
                      </p>
                    </div>
                  </motion.div>
                );
              })}
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="flex-1 py-3 rounded-xl border border-[var(--border)] text-sm text-[var(--muted)] hover:text-[var(--text)] transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={saving || !examName.trim() || !division}
                className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-brand-500 text-white text-sm font-medium hover:bg-brand-600 transition-colors disabled:opacity-50 shadow-md shadow-brand-500/20"
              >
                {saved ? (
                  <><CheckCircle2 className="w-4 h-4" /> Saved!</>
                ) : saving ? (
                  <><RefreshCw className="w-4 h-4 animate-spin" /> Saving…</>
                ) : (
                  <><Save className="w-4 h-4" /> Save Exam</>
                )}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {loading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-24 rounded-2xl bg-[var(--border)] animate-pulse" />
          ))}
        </div>
      ) : exams.length === 0 ? (
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-12 text-center space-y-3">
          <p className="text-2xl">📋</p>
          <p className="font-bold text-[var(--text)]">No exams yet</p>
          <button
            onClick={() => {
              resetForm();
              setShowForm(true);
            }}
            className="px-5 py-2.5 rounded-xl bg-brand-500 text-white text-sm hover:bg-brand-600 transition-colors"
          >
            Create First Exam
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {exams.map((exam, idx) => {
            const examAny = exam as unknown as Record<string, unknown>;
            const hasNewFormat =
              Array.isArray(exam.subjects) && exam.subjects.length > 0;
            const oldSubject = examAny.subject as string | undefined;
            const oldTopic = examAny.topic as string | undefined;
            const oldMaxMarks = examAny.totalMarks as number | undefined;
            const oldPaperType = examAny.paperType as string | undefined;

            return (
              <motion.div
                key={exam.id}
                className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 hover:border-brand-400/30 transition-all group"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.04 }}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      <p className="font-bold text-[var(--text)]">{exam.examName}</p>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-brand-500/10 text-brand-400 border border-brand-500/20">
                        {exam.division}
                      </span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-[var(--border)]/40 text-[var(--muted)] border border-[var(--border)]">
                        Class {exam.class}
                      </span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        {exam.stream || "All Streams"}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-[var(--muted)] mb-3">
                      <Calendar className="w-3.5 h-3.5" />
                      {formatDate(exam.date)}
                      {exam.day && <span>· {exam.day}</span>}
                    </div>
                    {hasNewFormat ? (
                      <div className="flex flex-wrap gap-2">
                        {exam.subjects.map((s, i) => {
                          const label = topicDisplayLabel(
                            s.subject,
                            s.topic || "",
                            exam.id,
                            occurrenceMap
                          );
                          return (
                            <div
                              key={i}
                              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-xs"
                              style={{
                                color: SUBJECT_COLORS[s.subject] || "#6b7280",
                                borderColor: `${SUBJECT_COLORS[s.subject] || "#6b7280"}30`,
                                background: `${SUBJECT_COLORS[s.subject] || "#6b7280"}10`,
                              }}
                            >
                              <span className="font-bold">{s.subject}</span>
                              {label && (
                                <span className="text-[var(--muted)]">· {label}</span>
                              )}
                              <span className="text-[var(--muted)]">· {s.paperType}</span>
                              <span className="font-mono font-bold">/{s.maximumMarks}</span>
                            </div>
                          );
                        })}
                      </div>
                    ) : oldSubject ? (
                      <div className="flex flex-wrap gap-2">
                        <div
                          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-xs"
                          style={{
                            color: SUBJECT_COLORS[oldSubject] || "#6b7280",
                            borderColor: `${SUBJECT_COLORS[oldSubject] || "#6b7280"}30`,
                            background: `${SUBJECT_COLORS[oldSubject] || "#6b7280"}10`,
                          }}
                        >
                          <span className="font-bold">{oldSubject}</span>
                          {oldTopic && (
                            <span className="text-[var(--muted)]">· {oldTopic}</span>
                          )}
                          {oldPaperType && (
                            <span className="text-[var(--muted)]">· {oldPaperType}</span>
                          )}
                          {oldMaxMarks && (
                            <span className="font-mono font-bold">/{oldMaxMarks}</span>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 text-xs">
                        ⚠️ Old format — missing subject config.
                        <button
                          onClick={() => handleDelete(exam.id, exam.examName)}
                          className="underline hover:no-underline"
                        >
                          Delete & recreate
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => router.push("/marks")}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-brand-500/10 border border-brand-500/20 text-brand-400 text-xs hover:bg-brand-500/20 transition-colors"
                    >
                      Enter Marks <ChevronRight className="w-3 h-3" />
                    </button>
                    {isAdmin && (
                      <button
                        onClick={() => handleDelete(exam.id, exam.examName)}
                        className="p-2 rounded-xl text-red-400 hover:bg-red-500/10 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}