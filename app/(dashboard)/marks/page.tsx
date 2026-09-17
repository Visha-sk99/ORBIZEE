"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus, Save, RefreshCw, CheckCircle2,
  Trash2, Edit2, X, Download,
} from "lucide-react";
import { useStudents } from "@/hooks/useStudents";
import { useInstituteConfig } from "@/hooks/useInstituteConfig";
import { useAuth } from "@/hooks/useAuth";
import { useExams } from "@/hooks/useExams";
import { addExam, updateExam, deleteExam } from "@/services/examService";
import { getMarksByExam, saveExamMarks } from "@/services/marksService";
import { STREAMS } from "@/lib/utils";
import type { Exam, Mark, Subject, PaperType, SubjectConfig, Stream } from "@/types";

// ── Types ─────────────────────────────────────────────────────────────────
type MarkStatus = "present" | "AB" | "ML" | "NA";
type MarkCellValue = number | MarkStatus;

function isStatus(v: MarkCellValue): v is MarkStatus {
  return v === "AB" || v === "ML" || v === "NA";
}

// ── Constants ─────────────────────────────────────────────────────────────
const SUBJECTS: Subject[] = ["Physics", "Chemistry", "Mathematics", "Biology"];
const PAPER_TYPES: PaperType[] = [
  "Theory", "Entrance", "Practical", "MCQ", "Unit Test", "Assignment",
];
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

// ── Mark Cell ─────────────────────────────────────────────────────────────
interface CellProps {
  value: MarkCellValue;
  maxMarks: number;
  rowIdx: number;
  colIdx: number;
  focused: boolean;
  onFocus: (r: number, c: number) => void;
  onChange: (r: number, c: number, val: MarkCellValue) => void;
  onNavigate: (r: number, c: number, dir: "up" | "down" | "left" | "right" | "next" | "prev") => void;
}
function MarkCell({
  value,
  maxMarks,
  rowIdx,
  colIdx,
  focused,
  onFocus,
  onChange,
  onNavigate,
}: CellProps) {
  const ref = useRef<HTMLInputElement>(null);

  // Display string derived from value
  const display = isStatus(value) ? "" : String(value);

  useEffect(() => {
    if (focused && ref.current) {
      ref.current.focus();
      ref.current.select();
    }
  }, [focused]);

  const commit = (raw: string) => {
    const t = raw.trim();
    if (t === "") {
      onChange(rowIdx, colIdx, "AB");
      return;
    }
    const n = Number(t);
    if (isNaN(n) || n < 0 || n > maxMarks) return;
    onChange(rowIdx, colIdx, n);
  };

  const NUMPAD_DIGITS: Record<string, string> = {
    Numpad0: "0",
    Numpad1: "1",
    Numpad2: "2",
    Numpad3: "3",
    Numpad4: "4",
    Numpad5: "5",
    Numpad6: "6",
    Numpad7: "7",
    Numpad8: "8",
    Numpad9: "9",
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    const el = e.currentTarget;

    // Numpad digits: e.code stays "NumpadN" even when NumLock is OFF,
    // even though e.key becomes "ArrowDown"/"ArrowUp"/etc in that state.
    if (e.code in NUMPAD_DIGITS && e.key !== NUMPAD_DIGITS[e.code]) {
      e.preventDefault();
      const digit = NUMPAD_DIGITS[e.code];
      const start = el.selectionStart ?? el.value.length;
      const end = el.selectionEnd ?? el.value.length;
      const next = el.value.slice(0, start) + digit + el.value.slice(end);
      if (/^\d{0,4}$/.test(next)) {
        el.value = next;
        el.setSelectionRange(start + 1, start + 1);
      }
      return;
    }

    if (e.key === "Enter" || e.code === "NumpadEnter") {
      e.preventDefault();
      commit(el.value);
      onNavigate(rowIdx, colIdx, "down");
      return;
    }

    if (e.key === "Tab") {
      e.preventDefault();
      commit(el.value);
      onNavigate(rowIdx, colIdx, e.shiftKey ? "prev" : "next");
      return;
    }

    if (e.key === "ArrowUp") {
      e.preventDefault();
      commit(el.value);
      onNavigate(rowIdx, colIdx, "up");
      return;
    }

    if (e.key === "ArrowDown") {
      e.preventDefault();
      commit(el.value);
      onNavigate(rowIdx, colIdx, "down");
      return;
    }

    if (e.key === "ArrowLeft" && el.selectionStart === 0 && el.selectionEnd === 0) {
      e.preventDefault();
      commit(el.value);
      onNavigate(rowIdx, colIdx, "left");
      return;
    }

    if (
      e.key === "ArrowRight" &&
      el.selectionStart === el.value.length &&
      el.selectionEnd === el.value.length
    ) {
      e.preventDefault();
      commit(el.value);
      onNavigate(rowIdx, colIdx, "right");
      return;
    }
  };

  return (
    <div
      className="relative w-full h-full"
      onClick={() => onFocus(rowIdx, colIdx)}
    >
      {/* Always show the number / AB as overlay when not focused */}
      {!focused && (
        <div className="absolute inset-0 flex items-center justify-center text-xs font-mono pointer-events-none z-10">
          {isStatus(value) ? (
            <span className="text-red-400">{value}</span>
          ) : (
            <>
              <span className="font-semibold text-[var(--text)]">{value}</span>
              <span className="text-[var(--muted)] text-[10px] ml-0.5">/{maxMarks}</span>
            </>
          )}
        </div>
      )}

      <input
        ref={ref}
        type="text"
        inputMode="numeric"
        defaultValue={display}
        key={`${rowIdx}-${colIdx}-${isStatus(value) ? value : value}`}
        onFocus={() => onFocus(rowIdx, colIdx)}
        onChange={e => {
          const v = e.target.value;
          // live-filter non-digits
          if (v !== "" && !/^\d{0,4}$/.test(v)) {
            e.target.value = v.replace(/\D/g, "").slice(0, 4);
          }
        }}
        onBlur={e => commit(e.target.value)}
        onKeyDown={handleKeyDown}
        className={`w-full h-full text-center text-sm font-mono outline-none
          text-[var(--text)] caret-brand-400
          ${focused
            ? "bg-brand-500/15 border-2 border-brand-400 relative z-20"
            : "bg-transparent border-0 opacity-0"
          }`}
      />
    </div>
  );
}
// ── Exam Setup Panel ──────────────────────────────────────────────────────
const DEFAULT_SUBJECT: SubjectConfig = {
  subject: "Physics",
  topic: "",
  paperType: "Theory",
  maximumMarks: 100,
};

function ExamSetupPanel({
  onCreated,
  editingExam,
  onCancel,
  allDivisions,
  allStandards,
}: {
  onCreated: (e: Exam) => void;
  editingExam: Exam | null;
  onCancel: () => void;
  allDivisions: string[];
  allStandards: string[];
}) {
  const [examName, setExamName] = useState(editingExam?.examName || "");
  const [division, setDivision] = useState<string>(editingExam?.division || "");
  const [stream, setStream] = useState<Stream | "">(editingExam?.stream || "");
  const [date, setDate] = useState(
    editingExam?.date || new Date().toISOString().split("T")[0]
  );
  const [subjects, setSubjects] = useState<SubjectConfig[]>(
    editingExam?.subjects?.length
      ? (editingExam.subjects as SubjectConfig[])
      : [{ ...DEFAULT_SUBJECT }]
  );
  const [saving, setSaving] = useState(false);
  const day = getDayFromDate(date);

  const addSubject = () => {
    setSubjects(s => [
      ...s,
      { ...DEFAULT_SUBJECT, subject: SUBJECTS[s.length % SUBJECTS.length] },
    ]);
  };

  const removeSubject = (i: number) =>
    setSubjects(s => s.filter((_, idx) => idx !== i));

  const updateSub = <K extends keyof SubjectConfig>(
    i: number,
    key: K,
    val: SubjectConfig[K]
  ) => {
    setSubjects(s => {
      const n = [...s];
      n[i] = { ...n[i], [key]: val };
      return n;
    });
  };

  const handleSubmit = async () => {
    if (!examName.trim() || !division || !subjects.length) return;
    if (subjects.some(s => !s.maximumMarks || s.maximumMarks <= 0)) {
      alert("All subjects must have a maximum marks value greater than 0.");
      return;
    }
    // Stream required for new exams; optional when editing legacy exams
    if (!editingExam && !stream) {
      alert("Please select a Stream.");
      return;
    }

    setSaving(true);
    try {
      const std =
        allStandards.find(s => division.startsWith(s)) ||
        division.replace(/[A-Za-z]+$/, "");

      const payload: Omit<Exam, "id"> = {
        examName: examName.trim(),
        class: std as Exam["class"],
        division: division as Exam["division"],
        stream: (stream || undefined) as Exam["stream"],
        date,
        day,
        subjects,
      };

      if (editingExam) {
        await updateExam(editingExam.id, payload);
        onCreated({ id: editingExam.id, ...payload });
      } else {
        const id = await addExam(payload);
        onCreated({ id: String(id), ...payload });
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <motion.div
      className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 space-y-5"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <div className="flex items-center justify-between">
        <h2 className="font-bold text-[var(--text)]">
          {editingExam ? "✏️ Edit Exam" : "📋 Create New Exam"}
        </h2>
        <button
          type="button"
          onClick={onCancel}
          className="p-1.5 rounded-lg text-[var(--muted)] hover:bg-[var(--border)] transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Exam meta */}
      <div className="rounded-xl bg-[var(--bg)] border border-[var(--border)] p-4 space-y-3">
        <p className="text-xs text-[var(--muted)] uppercase tracking-wider font-mono">
          Exam Details
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="sm:col-span-2">
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
              {allDivisions.map((d: string) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs text-[var(--muted)] mb-1 block">
              Stream {!editingExam && "*"}
            </label>
            <select
              value={stream}
              onChange={e => setStream(e.target.value as Stream | "")}
              className="w-full px-3 py-2 rounded-xl bg-[var(--surface)] border border-[var(--border)] text-sm text-[var(--text)] focus:outline-none focus:border-brand-400/60"
            >
              <option value="">Select Stream</option>
              {STREAMS.map(s => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>

          <div className="sm:col-span-2 lg:col-span-4">
            <label className="text-xs text-[var(--muted)] mb-1 block">Exam Date *</label>
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

      {/* Subject configuration */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-[var(--text)] uppercase tracking-wider">
              Subject Configuration
            </p>
            <p className="text-xs text-[var(--muted)] mt-0.5">
              Enter maximum marks once — applies to all students
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

        {subjects.map((sub, i) => (
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
                  onChange={e => updateSub(i, "subject", e.target.value as Subject)}
                  className="w-full px-2 py-2 rounded-xl bg-[var(--surface)] border border-[var(--border)] text-sm text-[var(--text)] focus:outline-none"
                >
                  {SUBJECTS.map(s => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[10px] text-[var(--muted)] mb-1 block uppercase tracking-wider">
                  Topic
                </label>
                <input
                  value={sub.topic}
                  onChange={e => updateSub(i, "topic", e.target.value)}
                  placeholder="e.g. Trigonometry"
                  className="w-full px-2 py-2 rounded-xl bg-[var(--surface)] border border-[var(--border)] text-sm text-[var(--text)] focus:outline-none focus:border-brand-400/60"
                />
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
                    <option key={p} value={p}>
                      {p}
                    </option>
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
                  max={1000}
                  value={sub.maximumMarks}
                  onChange={e =>
                    updateSub(i, "maximumMarks", Number(e.target.value))
                  }
                  className="w-full px-3 py-2 rounded-xl bg-[var(--surface)] border-2 border-emerald-500/40 text-sm text-emerald-400 font-mono font-bold focus:outline-none focus:border-emerald-500/80 text-center"
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
                  {" "}
                  · /{sub.maximumMarks}
                </span>
              </p>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="flex gap-3">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 py-3 rounded-xl border border-[var(--border)] text-sm text-[var(--muted)] hover:text-[var(--text)] transition-colors"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={
            saving ||
            !examName.trim() ||
            !division ||
            !subjects.length ||
            (!editingExam && !stream)
          }
          className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-brand-500 text-white text-sm font-medium hover:bg-brand-600 transition-colors disabled:opacity-50"
        >
          {saving ? (
            <RefreshCw className="w-4 h-4 animate-spin" />
          ) : (
            <Plus className="w-4 h-4" />
          )}
          {saving
            ? "Saving…"
            : editingExam
            ? "Update Exam"
            : "Create Exam & Open Table"}
        </button>
      </div>
    </motion.div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────
export default function MarksPage() {
  const { students } = useStudents();
  const { exams, refresh: refreshExams } = useExams();
  const { isAdmin } = useAuth();
  const { allDivisions, allStandards } = useInstituteConfig();

  const [view, setView] = useState<"list" | "setup" | "table">("list");
  const [activeExam, setActiveExam] = useState<Exam | null>(null);
  const [editingExam, setEditingExam] = useState<Exam | null>(null);
  const [tableData, setTableData] = useState<MarkCellValue[][]>([]);
  const [loadingMarks, setLoadingMarks] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const [focusedCell, setFocusedCell] = useState<[number, number] | null>(null);

  // CRITICAL: filter by division + stream
  const divStudents = useMemo(() => {
    if (!activeExam) return [];
    return students
      .filter(s => {
        if (s.division !== activeExam.division) return false;
        // If exam has a stream, only show students of that stream
        if (activeExam.stream) {
          return s.stream === activeExam.stream;
        }
        // Legacy exams without stream → show all students of the division
        return true;
      })
      .sort(
        (a, b) => (parseInt(a.rollNumber) || 0) - (parseInt(b.rollNumber) || 0)
      );
  }, [students, activeExam]);
const loadedExamId = useRef<string | null>(null);

useEffect(() => {
  if (!activeExam || view !== "table") return;

  // Only load once per exam open — never while typing
  if (loadedExamId.current === activeExam.id) return;
  loadedExamId.current = activeExam.id;

  let cancelled = false;
  setLoadingMarks(true);

  getMarksByExam(activeExam.id)
    .then(existing => {
      if (cancelled) return;

      const filtered = students
        .filter(s => {
          if (s.division !== activeExam.division) return false;
          if (activeExam.stream) return s.stream === activeExam.stream;
          return true;
        })
        .sort(
          (a, b) =>
            (parseInt(a.rollNumber) || 0) - (parseInt(b.rollNumber) || 0)
        );

      const cols = (activeExam.subjects || []).length || 1;
      const data: MarkCellValue[][] = filtered.map(student =>
        (activeExam.subjects || []).map(sub => {
          const m = existing.find(
            e => e.studentId === student.id && e.subject === sub.subject
          );
          if (!m) return "AB" as MarkStatus;
          if (m.status !== "present") return m.status as MarkStatus;
          return m.obtainedMarks ?? ("AB" as MarkStatus);
        })
      );
      setTableData(data);
    })
    .finally(() => {
      if (!cancelled) setLoadingMarks(false);
    });

  return () => {
    cancelled = true;
  };
}, [activeExam?.id, view]); // NO students, NO divStudents, [activeExam?.id, view]);
 const openExam = (exam: Exam) => {
  setActiveExam(exam);
  setFocusedCell(null);
  setSavedAt(null);

  // Pre-build empty rows so typing always works
  const filtered = students
    .filter(s => {
      if (s.division !== exam.division) return false;
      if (exam.stream) return s.stream === exam.stream;
      return true;
    })
    .sort((a, b) => (parseInt(a.rollNumber) || 0) - (parseInt(b.rollNumber) || 0));

  const cols = (exam.subjects || []).length || 1;
  const empty: MarkCellValue[][] = filtered.map(() =>
    Array(cols).fill("AB" as MarkStatus)
  );
  setTableData(empty);

  setView("table");
};

  const handleCellChange = useCallback((ri: number, ci: number, val: MarkCellValue) => {
  setTableData(prev => {
    // Make a full copy of existing rows
    const next = prev.map(r => [...r]);

    // If this row doesn't exist yet, create it
    while (next.length <= ri) {
      const cols = activeExam?.subjects?.length || 1;
      next.push(Array(cols).fill("AB" as MarkStatus));
    }

    // If this column is missing, pad the row
    while (next[ri].length <= ci) {
      next[ri].push("AB" as MarkStatus);
    }

    next[ri][ci] = val;
    return next;
  });
}, [activeExam]);

  const handleFocus = useCallback(
    (ri: number, ci: number) => setFocusedCell([ri, ci]),
    []
  );

  const handleNavigate = useCallback(
    (
      ri: number,
      ci: number,
      dir: "up" | "down" | "left" | "right" | "next" | "prev"
    ) => {
      if (!activeExam) return;
      const R = divStudents.length;
      const C = (activeExam.subjects || []).length;
      let nr = ri;
      let nc = ci;
      if (dir === "up") nr = Math.max(0, ri - 1);
      if (dir === "down") nr = Math.min(R - 1, ri + 1);
      if (dir === "left") nc = Math.max(0, ci - 1);
      if (dir === "right") nc = Math.min(C - 1, ci + 1);
      if (dir === "next") {
        nc++;
        if (nc >= C) {
          nc = 0;
          nr = Math.min(R - 1, ri + 1);
        }
      }
      if (dir === "prev") {
        nc--;
        if (nc < 0) {
          nc = C - 1;
          nr = Math.max(0, ri - 1);
        }
      }
      setFocusedCell([nr, nc]);
    },
    [activeExam, divStudents.length]
  );

  const handleSaveAll = async () => {
    if (!activeExam || !tableData.length) return;
    setSaving(true);
    try {
      const marks: Omit<Mark, "id">[] = [];
      divStudents.forEach((student, ri) => {
        (activeExam.subjects || []).forEach((sub, ci) => {
          const val = tableData[ri]?.[ci] ?? "AB";
          const status: MarkStatus = isStatus(val) ? val : "present";
          const obtained = isStatus(val) ? null : (val as number);
          const pct =
            status === "present" &&
            obtained !== null &&
            sub.maximumMarks > 0
              ? Math.round((obtained / sub.maximumMarks) * 1000) / 10
              : 0;
              marks.push({
                examId: activeExam.id,
                studentId: student.id,
                studentName: student.fullName,
                subject: sub.subject,
                topic: sub.topic,
                paperType: sub.paperType,
                obtainedMarks: obtained,
                maximumMarks: sub.maximumMarks,
                status,
                percentage: pct,
                class: activeExam.class,
                division: activeExam.division,
                ...(activeExam.stream ? { stream: activeExam.stream } : {}),
                date: activeExam.date,
              });
        });
      });
      await saveExamMarks(marks);
      setSavedAt(new Date());
    } finally {
      setSaving(false);
    }
  };

  const getRowSummary = (ri: number) => {
    if (!activeExam || !tableData[ri])
      return { obtained: 0, total: 0, pct: 0, hasData: false };
    let obtained = 0;
    let total = 0;
    let hasData = false;
    (activeExam.subjects || []).forEach((sub, ci) => {
      const val = tableData[ri][ci];
      if (!isStatus(val)) {
        obtained += val as number;
        total += sub.maximumMarks;
        hasData = true;
      }
    });
    return {
      obtained,
      total,
      pct: total > 0 ? Math.round((obtained / total) * 1000) / 10 : 0,
      hasData,
    };
  };

  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-[var(--muted)]">Admin access required.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-bold text-xl text-[var(--text)]">Marks Entry</h1>
          <p className="text-xs text-[var(--muted)]">
            {view === "table" && activeExam
              ? `${activeExam.examName} · ${activeExam.division}${
                  activeExam.stream ? ` · ${activeExam.stream}` : ""
                } · ${divStudents.length} students`
              : view === "setup"
              ? editingExam
                ? "Editing exam configuration"
                : "Setting up new exam"
              : `${exams.length} exam${exams.length !== 1 ? "s" : ""} available`}
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          {view === "table" && (
            <>
              <button
                onClick={() => {
                  setEditingExam(activeExam);
                  setView("setup");
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[var(--surface)] border border-[var(--border)] text-xs text-[var(--muted)] hover:text-[var(--text)] transition-colors"
              >
                <Edit2 className="w-3.5 h-3.5" /> Edit Exam
              </button>
              <button
                onClick={() => {
                  setView("list");
                  setActiveExam(null);
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[var(--surface)] border border-[var(--border)] text-xs text-[var(--muted)] hover:text-[var(--text)] transition-colors"
              >
                ← All Exams
              </button>
              <button
                onClick={() => {
                  if (!activeExam) return;
                  import("@/lib/exportPDF").then(({ exportMarksPDF }) => {
                    exportMarksPDF(
                      activeExam,
                      divStudents,
                      tableData as (number | "AB" | "ML" | "NA")[][]
                    );
                  });
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-medium hover:bg-emerald-500/20 transition-colors"
              >
                <Download className="w-3.5 h-3.5" /> Export PDF
              </button>
              <button
                onClick={handleSaveAll}
                disabled={saving}
                className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-brand-500 text-white text-xs font-medium hover:bg-brand-600 transition-colors disabled:opacity-50 shadow-md shadow-brand-500/20"
              >
                {saving ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Save className="w-3.5 h-3.5" />
                )}
                {saving ? "Saving…" : "Save All"}
              </button>
            </>
          )}
          {view === "list" && (
            <button
              onClick={() => {
                setEditingExam(null);
                setView("setup");
              }}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-brand-500 text-white text-xs font-medium hover:bg-brand-600 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" /> New Exam
            </button>
          )}
        </div>
      </div>

      <AnimatePresence>
        {savedAt && (
          <motion.div
            className="flex items-center gap-1.5 text-xs text-emerald-400"
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            Saved at {savedAt.toLocaleTimeString()}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Setup */}
      {view === "setup" && (
        <ExamSetupPanel
          editingExam={editingExam}
          allDivisions={allDivisions}
          allStandards={allStandards}
          onCreated={async exam => {
            await refreshExams();
            openExam(exam);
            setEditingExam(null);
          }}
          onCancel={() => {
            setEditingExam(null);
            setView(activeExam ? "table" : "list");
          }}
        />
      )}

      {/* List */}
      {view === "list" && (
        <div className="space-y-2">
          {exams.length === 0 ? (
            <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-12 text-center space-y-3">
              <p className="text-2xl">📋</p>
              <p className="font-bold text-[var(--text)]">No exams yet</p>
              <button
                onClick={() => setView("setup")}
                className="px-5 py-2.5 rounded-xl bg-brand-500 text-white text-sm hover:bg-brand-600 transition-colors"
              >
                Create First Exam
              </button>
            </div>
          ) : (
            exams.map((exam, idx) => (
              <motion.div
                key={exam.id}
                className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-2xl border border-[var(--border)] bg-[var(--surface)] hover:border-brand-400/30 transition-all group gap-3"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.04 }}
              >
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-bold text-[var(--text)]">{exam.examName}</p>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-brand-500/10 text-brand-400 border border-brand-500/20">
                      {exam.division}
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      {exam.stream || "Stream Not Assigned"}
                    </span>
                  </div>
                  <p className="text-xs text-[var(--muted)]">
                    {exam.date} · {exam.day}
                  </p>
                  <div className="flex gap-1.5 flex-wrap">
                    {(exam.subjects || []).map((s, i) => (
                      <span
                        key={i}
                        className="px-2 py-0.5 rounded-full text-[10px] font-mono border"
                        style={{
                          color: SUBJECT_COLORS[s.subject] || "#6b8eff",
                          borderColor: `${SUBJECT_COLORS[s.subject] || "#6b8eff"}30`,
                          background: `${SUBJECT_COLORS[s.subject] || "#6b8eff"}10`,
                        }}
                      >
                        {s.subject} · {s.paperType} ·{" "}
                        <span className="font-bold">/{s.maximumMarks}</span>
                      </span>
                    ))}
                  </div>
                </div>

                <div className="flex items-center gap-2 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => {
                      setEditingExam(exam);
                      setView("setup");
                    }}
                    className="p-2 rounded-xl text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--border)] transition-colors"
                    title="Edit exam"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={async () => {
                      if (
                        confirm(
                          `Delete "${exam.examName}" and all its marks?`
                        )
                      ) {
                        await deleteExam(exam.id);
                        refreshExams();
                      }
                    }}
                    className="p-2 rounded-xl text-red-400 hover:bg-red-500/10 transition-colors"
                    title="Delete exam"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => openExam(exam)}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-brand-500 text-white text-sm font-medium hover:bg-brand-600 transition-colors shadow-md shadow-brand-500/20"
                  >
                    Enter Marks →
                  </button>
                </div>
              </motion.div>
            ))
          )}
        </div>
      )}

      {/* Table */}
      {view === "table" && activeExam && (
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] overflow-hidden flex flex-col">
          <div className="flex items-center gap-4 px-4 py-2.5 bg-brand-500/5 border-b border-[var(--border)] flex-wrap">
            <span className="text-xs font-mono text-brand-400 font-bold">
              {activeExam.examName}
            </span>
            <span className="text-xs text-[var(--muted)]">
              {activeExam.date} · {activeExam.day}
            </span>
            <span className="text-xs text-[var(--muted)]">
              {activeExam.division}
              {activeExam.stream ? ` · ${activeExam.stream}` : ""}
            </span>
            <div className="flex gap-2 ml-auto flex-wrap">
              {(activeExam.subjects || []).map((s, i) => (
                <span
                  key={i}
                  className="text-[10px] font-mono px-1.5 py-0.5 rounded border"
                  style={{
                    color: SUBJECT_COLORS[s.subject] || "#6b8eff",
                    borderColor: `${SUBJECT_COLORS[s.subject] || "#6b8eff"}30`,
                    background: `${SUBJECT_COLORS[s.subject] || "#6b8eff"}10`,
                  }}
                >
                  {s.subject} /{s.maximumMarks || "?"}
                </span>
              ))}
            </div>
          </div>

          {loadingMarks ? (
            <div className="flex items-center justify-center py-20 gap-2 text-sm text-[var(--muted)]">
              <RefreshCw className="w-4 h-4 animate-spin" /> Loading marks…
            </div>
          ) : divStudents.length === 0 ? (
            <div className="flex items-center justify-center py-20 text-sm text-[var(--muted)]">
              No students match this exam’s division
              {activeExam.stream ? ` + stream (${activeExam.stream})` : ""}.
            </div>
          ) : (
            <div className="overflow-auto scrollbar-hide">
              <table
                className="w-full border-collapse"
                style={{
                  tableLayout: "fixed",
                  minWidth:
                    260 + (activeExam.subjects || []).length * 140 + 160,
                }}
              >
                <colgroup>
                  <col style={{ width: 52 }} />
                  <col style={{ width: 200 }} />
                  {(activeExam.subjects || []).map((_, i) => (
                    <col key={i} style={{ width: 140 }} />
                  ))}
                  <col style={{ width: 90 }} />
                  <col style={{ width: 70 }} />
                </colgroup>

                <thead className="sticky top-0 z-10">
                  <tr className="bg-[var(--surface)] border-b-2 border-[var(--border)]">
                    <th className="text-center py-3 text-xs font-mono text-[var(--muted)] border-r border-[var(--border)]">
                      Roll
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-bold text-[var(--text)] border-r border-[var(--border)]">
                      Student Name
                    </th>
                    {(activeExam.subjects || []).map((sub, i) => (
                      <th
                        key={i}
                        className="text-center py-3 px-2 border-r border-[var(--border)]"
                      >
                        <div className="space-y-0.5">
                          <p
                            className="font-bold text-xs"
                            style={{ color: SUBJECT_COLORS[sub.subject] }}
                          >
                            {sub.subject}
                          </p>
                          {sub.topic && (
                            <p className="text-[9px] text-[var(--muted)] truncate max-w-[120px] mx-auto">
                              {sub.topic}
                            </p>
                          )}
                          <p className="text-[10px] text-[var(--muted)] font-mono">
                            {sub.paperType}
                          </p>
                          <p className="text-[11px] font-bold text-emerald-400 font-mono">
                            /{sub.maximumMarks}
                          </p>
                        </div>
                      </th>
                    ))}
                    <th className="text-center py-3 px-2 text-xs font-mono text-[var(--muted)] border-l border-[var(--border)]">
                      Total
                    </th>
                    <th className="text-center py-3 px-2 text-xs font-mono text-[var(--muted)]">
                      %
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {divStudents.map((student, ri) => {
                    const { obtained, total, pct, hasData } =
                      getRowSummary(ri);
                    return (
                      <tr
                        key={student.id}
                        className={`border-b border-[var(--border)] transition-colors ${
                          ri % 2 === 0
                            ? "bg-[var(--surface)]"
                            : "bg-[var(--border)]/8"
                        } hover:bg-brand-500/4`}
                      >
                        <td className="text-center text-xs font-mono text-[var(--muted)] border-r border-[var(--border)] h-11">
                          {student.rollNumber}
                        </td>
                        <td className="px-4 border-r border-[var(--border)] h-11">
                          <div className="flex items-center gap-2">
                            <span className="w-6 h-6 rounded-full bg-brand-500/20 text-brand-400 text-[10px] flex items-center justify-center font-bold flex-shrink-0">
                              {student.fullName[0]}
                            </span>
                            <span className="text-sm text-[var(--text)] truncate">
                              {student.fullName}
                            </span>
                          </div>
                        </td>
                        {(activeExam.subjects || []).map((sub, ci) => (
                          <td
                            key={ci}
                            className="p-0 h-11 border-r border-[var(--border)] relative"
                          >
                            {tableData[ri] !== undefined ? (
                              <MarkCell
                                value={tableData[ri][ci] ?? "AB"}
                                maxMarks={sub.maximumMarks}
                                rowIdx={ri}
                                colIdx={ci}
                                focused={
                                  focusedCell?.[0] === ri &&
                                  focusedCell?.[1] === ci
                                }
                                onFocus={handleFocus}
                                onChange={handleCellChange}
                                onNavigate={handleNavigate}
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-xs text-red-400 font-mono font-bold">
                                AB
                              </div>
                            )}
                          </td>
                        ))}
                        <td className="text-center text-xs font-mono text-[var(--text)] border-l border-[var(--border)] h-11 px-2 font-semibold">
                          {hasData ? `${obtained}/${total}` : "—"}
                        </td>
                        <td
                          className={`text-center text-xs font-mono font-bold h-11 px-2 ${
                            pct >= 80
                              ? "text-emerald-400"
                              : pct >= 60
                              ? "text-yellow-400"
                              : pct > 0
                              ? "text-red-400"
                              : "text-[var(--muted)]"
                          }`}
                        >
                          {hasData ? `${pct}%` : "—"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          <div className="flex items-center justify-between px-4 py-2 border-t border-[var(--border)] bg-[var(--border)]/10">
            <p className="text-xs text-[var(--muted)] font-mono">
              {
                tableData.filter(r => r && r.some(v => !isStatus(v))).length
              }{" "}
              / {divStudents.length} students entered
            </p>
            <div className="flex items-center gap-3 text-xs text-[var(--muted)]">
              <span>
                <span className="text-red-400 font-mono font-bold">AB</span>{" "}
                Absent
              </span>
              <span>
                <span className="text-yellow-400 font-mono font-bold">ML</span>{" "}
                Medical
              </span>
              <span>
                <span className="font-mono">NA</span> Not Appeared
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}