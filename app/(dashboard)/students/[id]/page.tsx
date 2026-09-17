"use client";
import { use, useMemo, useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import {
  ArrowLeft, TrendingUp, TrendingDown, Minus,
  Download, Edit2, X, Save,
  CheckCircle2, AlertCircle,
} from "lucide-react";
import Link from "next/link";
import { useStudentMarks } from "@/hooks/useMarks";
import { calcPercentage, getPercentageColor, STREAMS } from "@/lib/utils";
import { getStudent, updateStudent } from "@/services/studentService";
import { useExams } from "@/hooks/useExams";
import { useAuth } from "@/hooks/useAuth";
import { useInstituteConfig } from "@/hooks/useInstituteConfig";
import {
  buildStudentChartData, SUBJECT_COLORS, SUBJECTS, SubjectData,
} from "@/lib/chartUtils";
import SubjectFreqPolygon from "@/components/charts/SubjectFreqPolygon";
import type { Student, Mark, Stream, Exam } from "@/types";
import LoadingScreen from "@/components/ui/LoadingScreen";

function Toast({ message, type }: { message: string; type: "success" | "error" }) {
  return (
    <motion.div
      className={`fixed bottom-6 right-6 z-[100] flex items-center gap-2 px-4 py-3 rounded-xl shadow-2xl text-sm font-medium ${
        type === "success" ? "bg-emerald-500 text-white" : "bg-red-500 text-white"
      }`}
      initial={{ opacity: 0, y: 16, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 8 }}
    >
      {type === "success" ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
      {message}
    </motion.div>
  );
}

function GrowthBadge({ value, label }: { value: number; label: string }) {
  const isUp = value > 0, isDown = value < 0;
  return (
    <div className={`flex flex-col items-center p-3 rounded-xl border ${
      isUp ? "bg-emerald-500/10 border-emerald-500/20" :
      isDown ? "bg-red-500/10 border-red-500/20" :
      "bg-[var(--border)]/30 border-[var(--border)]"
    }`}>
      <div className={`flex items-center gap-1 text-sm font-bold font-mono ${
        isUp ? "text-emerald-400" : isDown ? "text-red-400" : "text-[var(--muted)]"
      }`}>
        {isUp ? <TrendingUp className="w-4 h-4" /> :
         isDown ? <TrendingDown className="w-4 h-4" /> :
         <Minus className="w-4 h-4" />}
        {value > 0 ? "+" : ""}{value}%
      </div>
      <p className="text-[9px] text-[var(--muted)] mt-0.5 text-center leading-tight">{label}</p>
    </div>
  );
}

// ── Topic numbering helpers (same subject + same topic → I, II, III…) ─────
function toRoman(n: number): string {
  const romans = [
    "I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X",
    "XI", "XII", "XIII", "XIV", "XV", "XVI", "XVII", "XVIII", "XIX", "XX",
  ];
  return romans[n - 1] || String(n);
}

/** Map key "Physics||electrostatics" → ordered examIds (oldest first) */
function buildTopicOccurrenceMap(exams: Exam[], marks: Mark[]): Map<string, string[]> {
  const sorted = [...exams].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );
  const map = new Map<string, string[]>();

  const push = (subject: string, topic: string, examId: string) => {
    const t = topic.trim();
    if (!t) return;
    const key = `${subject}||${t.toLowerCase()}`;
    const list = map.get(key) || [];
    if (!list.includes(examId)) list.push(examId);
    map.set(key, list);
  };

  sorted.forEach(exam => {
    (exam.subjects || []).forEach(s => {
      push(s.subject, s.topic || "", exam.id);
    });
  });

  // Also index topics stored on marks (legacy / fallback)
  marks.forEach(m => {
    if (m.topic) push(m.subject, m.topic, m.examId);
  });

  return map;
}

function topicDisplayLabel(
  subject: string,
  topic: string | undefined,
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

interface EditModalProps {
  student: Student;
  onClose: () => void;
  onSaved: (updated: Student) => void;
}

function EditStudentModal({ student, onClose, onSaved }: EditModalProps) {
  const { allStandards, divisionsForStandard } = useInstituteConfig();

  const [form, setForm] = useState<Omit<Student, "id">>({
    fullName: student.fullName,
    rollNumber: student.rollNumber,
    class: student.class,
    division: student.division,
    stream: student.stream || ("" as Stream | ""),
    email: student.email || "",
    parentName: student.parentName || "",
    parentContact: student.parentContact || "",
    admissionDate: student.admissionDate || "",
    profilePhoto: student.profilePhoto || "",
  });
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const formDivisions = divisionsForStandard(form.class);

  const validate = (): boolean => {
    const errs: Record<string, string> = {};
    if (!form.fullName.trim()) errs.fullName = "Full name is required.";
    if (!form.rollNumber.trim()) errs.rollNumber = "Roll number is required.";
    if (!form.class) errs.class = "Class is required.";
    if (!form.division) errs.division = "Division is required.";
    if (!form.stream) errs.stream = "Stream is required.";
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      errs.email = "Enter a valid email.";
    }
    if (form.parentContact && !/^\+?[\d\s\-()]{7,15}$/.test(form.parentContact)) {
      errs.parentContact = "Enter a valid phone number.";
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      await updateStudent(student.id, form);
      onSaved({ id: student.id, ...form });
    } catch {
      setErrors({ save: "Failed to update student profile." });
    } finally {
      setSaving(false);
    }
  };

  const Field = ({
    label, field, type = "text", required = false,
  }: {
    label: string;
    field: keyof Omit<Student, "id">;
    type?: string;
    required?: boolean;
  }) => (
    <div>
      <label className="text-xs text-[var(--muted)] mb-1 block">
        {label}{required && <span className="text-red-400 ml-0.5">*</span>}
      </label>
      <input
        type={type}
        value={(form[field] as string) || ""}
        onChange={e => setForm(f => ({ ...f, [field]: e.target.value }))}
        className={`w-full px-3 py-2 rounded-xl bg-[var(--bg)] border text-sm text-[var(--text)] focus:outline-none focus:border-brand-400/60 ${
          errors[field as string] ? "border-red-500/60" : "border-[var(--border)]"
        }`}
      />
      {errors[field as string] && (
        <p className="text-red-400 text-[10px] mt-0.5">{errors[field as string]}</p>
      )}
    </div>
  );

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <motion.div
        className="w-full max-w-2xl bg-[var(--surface)] rounded-2xl border border-[var(--border)] shadow-2xl max-h-[90vh] overflow-y-auto"
        initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border)] sticky top-0 bg-[var(--surface)] z-10">
          <h2 className="font-bold text-[var(--text)]">Edit Student Profile</h2>
          <button type="button" onClick={onClose}
            className="p-1.5 rounded-lg text-[var(--muted)] hover:bg-[var(--border)] transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <Field label="Full Name" field="fullName" required />
            </div>
            <Field label="Roll Number" field="rollNumber" required />
            <Field label="Email" field="email" type="email" />

            <div>
              <label className="text-xs text-[var(--muted)] mb-1 block">
                Class / Standard<span className="text-red-400 ml-0.5">*</span>
              </label>
              <select
                value={form.class}
                onChange={e => {
                  const cls = e.target.value as Student["class"];
                  const firstDiv = divisionsForStandard(cls)[0] || "";
                  setForm(f => ({ ...f, class: cls, division: firstDiv as Student["division"] }));
                }}
                className="w-full px-3 py-2 rounded-xl bg-[var(--bg)] border border-[var(--border)] text-sm text-[var(--text)] focus:outline-none focus:border-brand-400/60"
              >
                {allStandards.map(s => (
                  <option key={s} value={s}>Standard {s}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs text-[var(--muted)] mb-1 block">
                Division<span className="text-red-400 ml-0.5">*</span>
              </label>
              {formDivisions.length === 0 ? (
                <div className="px-3 py-2 rounded-xl bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 text-xs">
                  No divisions for Standard {form.class}
                </div>
              ) : (
                <select
                  value={form.division}
                  onChange={e => {
                    const div = e.target.value;
                    const std = allStandards.find(s => div.startsWith(s)) || form.class;
                    setForm(f => ({
                      ...f,
                      division: div as Student["division"],
                      class: std as Student["class"],
                    }));
                  }}
                  className="w-full px-3 py-2 rounded-xl bg-[var(--bg)] border border-[var(--border)] text-sm text-[var(--text)] focus:outline-none focus:border-brand-400/60"
                >
                  {formDivisions.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              )}
            </div>

            <div className="sm:col-span-2">
              <label className="text-xs text-[var(--muted)] mb-1 block">
                Stream<span className="text-red-400 ml-0.5">*</span>
              </label>
              <select
                value={form.stream || ""}
                onChange={e => setForm(f => ({ ...f, stream: e.target.value as Stream }))}
                className={`w-full px-3 py-2 rounded-xl bg-[var(--bg)] border text-sm text-[var(--text)] focus:outline-none focus:border-brand-400/60 ${
                  errors.stream ? "border-red-500/60" : "border-[var(--border)]"
                }`}
              >
                <option value="">Select Stream</option>
                {STREAMS.map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
              {errors.stream && <p className="text-red-400 text-[10px] mt-0.5">{errors.stream}</p>}
            </div>

            <Field label="Parent Name" field="parentName" />
            <Field label="Parent Contact" field="parentContact" />
            <Field label="Admission Date" field="admissionDate" type="date" />
          </div>

          {errors.save && (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {errors.save}
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="flex-1 py-2.5 rounded-xl border border-[var(--border)] text-sm text-[var(--muted)] hover:text-[var(--text)] transition-colors">
              Cancel
            </button>
            <button type="button" onClick={handleSave} disabled={saving}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-brand-500 text-white text-sm font-medium hover:bg-brand-600 transition-colors disabled:opacity-50">
              {saving
                ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Saving…</>
                : <><Save className="w-4 h-4" /> Save Changes</>}
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

export default function StudentProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [student, setStudent] = useState<Student | null>(null);
  const { marks, loading } = useStudentMarks(id);
  const { exams } = useExams();
  const { isAdmin } = useAuth();
  const [exporting, setExporting] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  useEffect(() => { getStudent(id).then(setStudent); }, [id]);

  const showToast = (message: string, type: "success" | "error") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  const handleSaved = (updated: Student) => {
    setStudent(updated);
    setShowEdit(false);
    showToast("Student profile updated successfully.", "success");
  };

  const presentMarks = useMemo(() =>
    marks.filter(m => m.status === "present" && m.obtainedMarks !== null), [marks]);

  const overallPct = useMemo(() => {
    const tot = presentMarks.reduce((s, m) => s + m.maximumMarks, 0);
    const obt = presentMarks.reduce((s, m) => s + (m.obtainedMarks ?? 0), 0);
    return calcPercentage(obt, tot);
  }, [presentMarks]);

  const studentChartData: SubjectData = useMemo(() => {
    if (!presentMarks.length || !exams.length)
      return { Physics: [], Chemistry: [], Mathematics: [], Biology: [] };
    return buildStudentChartData(presentMarks, exams);
  }, [presentMarks, exams]);

  const subjectAvg = useMemo(() =>
    Object.fromEntries(
      SUBJECTS.map(sub => {
        const pts = studentChartData[sub];
        const avg = pts.length
          ? Math.round(pts.reduce((s, p) => s + p.percentage, 0) / pts.length * 10) / 10
          : 0;
        return [sub, avg];
      })
    ), [studentChartData]);

  const bestSubject = useMemo(() =>
    SUBJECTS.reduce((a, b) => (subjectAvg[a] ?? 0) >= (subjectAvg[b] ?? 0) ? a : b),
    [subjectAvg]);

  const weakSubject = useMemo(() =>
    SUBJECTS.reduce((a, b) => (subjectAvg[a] ?? 0) <= (subjectAvg[b] ?? 0) ? a : b),
    [subjectAvg]);

  const topicOccurrenceMap = useMemo(
    () => buildTopicOccurrenceMap(exams, marks),
    [exams, marks]
  );

  const examGroups = useMemo(() => {
    const map = new Map<string, {
      examId: string;
      date: string;
      name: string;
      marks: Mark[];
    }>();
    marks.forEach(m => {
      const exam = exams.find(e => e.id === m.examId);
      if (!exam) return;
      const existing = map.get(m.examId) || {
        examId: m.examId,
        date: exam.date,
        name: exam.examName,
        marks: [],
      };
      existing.marks.push(m);
      map.set(m.examId, existing);
    });
    return Array.from(map.values()).sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );
  }, [marks, exams]);

  const getExamPct = (grp: { marks: Mark[] }) => {
    const pm = grp.marks.filter(m => m.status === "present" && m.obtainedMarks !== null);
    const tot = pm.reduce((s, m) => s + m.maximumMarks, 0);
    const obt = pm.reduce((s, m) => s + (m.obtainedMarks ?? 0), 0);
    return calcPercentage(obt, tot);
  };

  const overallGrowth = useMemo(() => {
    if (examGroups.length < 2) return null;
    const first = examGroups[0];
    const last = examGroups[examGroups.length - 1];
    const firstPct = getExamPct(first);
    const lastPct = getExamPct(last);

    const subjectGrowth = Object.fromEntries(
      SUBJECTS.map(sub => {
        const pts = studentChartData[sub];
        if (!pts || pts.length < 2) return [sub, null];
        return [
          sub,
          Math.round((pts[pts.length - 1].percentage - pts[0].percentage) * 10) / 10,
        ];
      })
    );

    return {
      value: Math.round((lastPct - firstPct) * 10) / 10,
      firstPct,
      lastPct,
      from: first.name,
      to: last.name,
      totalExams: examGroups.length,
      subjectGrowth,
    };
  }, [examGroups, studentChartData]);

  const growthData = useMemo(() => {
    if (examGroups.length < 2) return null;

    const last3 = examGroups.slice(-3);
    const lastPcts = last3.map(getExamPct);
    const lastAvg =
      Math.round((lastPcts.reduce((s, p) => s + p, 0) / lastPcts.length) * 10) / 10;

    // Compare the average of the most recent window against the average of
    // the window immediately before it. A simple two-point comparison (first
    // vs last, or last vs second-last) can get stuck at 0% purely by
    // coincidence if any two exams in the window happen to tie — this
    // rolling-average approach is robust to that.
    const priorWindowSize = Math.min(3, examGroups.length - last3.length);
    const priorWindow =
      priorWindowSize > 0
        ? examGroups.slice(-(last3.length + priorWindowSize), -last3.length)
        : [];

    let overall: number;
    if (priorWindow.length > 0) {
      const priorPcts = priorWindow.map(getExamPct);
      const priorAvg = priorPcts.reduce((s, p) => s + p, 0) / priorPcts.length;
      overall = Math.round((lastAvg - priorAvg) * 10) / 10;
    } else if (lastPcts.length >= 2) {
      // Not enough exam history before this window — fall back to the
      // trend within the window itself (latest vs earliest of the last 3).
      overall = Math.round((lastPcts[lastPcts.length - 1] - lastPcts[0]) * 10) / 10;
    } else {
      return null;
    }

    const subjectGrowth = Object.fromEntries(
      SUBJECTS.map(sub => {
        const pts = studentChartData[sub];
        if (pts.length < 2) return [sub, null];

        const last3pts = pts.slice(-3);
        if (last3pts.length < 2) return [sub, null];
        const lastSubAvg =
          last3pts.reduce((s, p) => s + p.percentage, 0) / last3pts.length;

        const priorSize = Math.min(3, pts.length - last3pts.length);
        const priorPts =
          priorSize > 0
            ? pts.slice(-(last3pts.length + priorSize), -last3pts.length)
            : [];

        let val: number;
        if (priorPts.length > 0) {
          const priorSubAvg =
            priorPts.reduce((s, p) => s + p.percentage, 0) / priorPts.length;
          val = Math.round((lastSubAvg - priorSubAvg) * 10) / 10;
        } else {
          val = Math.round(
            (last3pts[last3pts.length - 1].percentage - last3pts[0].percentage) * 10
          ) / 10;
        }
        return [sub, val];
      })
    );

    return { overall, pcts: lastPcts, subjectGrowth, examNames: last3.map(g => g.name) };
  }, [examGroups, studentChartData]);

  const handleExportPDF = async () => {
    if (!student) return;
    setExporting(true);
    try {
      const { exportStudentReportPDF } = await import("@/lib/studentReportPDF");
      exportStudentReportPDF(
        student,
        examGroups.map(grp => ({
          name: grp.name,
          date: grp.date,
          marks: grp.marks.map(m => ({
            subject: m.subject,
            // Roman-numbered topic when same subject+topic repeats
            topic: topicDisplayLabel(
              m.subject,
              m.topic,
              grp.examId,
              topicOccurrenceMap
            ) || m.topic || "",
            paperType: m.paperType || "",
            obtainedMarks: m.obtainedMarks,
            maximumMarks: m.maximumMarks,
            status: m.status,
            percentage: m.percentage,
          })),
        })),
        overallPct,
        growthData?.overall ?? null,
        overallGrowth
      );
    } finally {
      setExporting(false);
    }
  };

  if (loading || !student) return <LoadingScreen />;

  return (
    <div className="space-y-5 animate-fade-in max-w-5xl mx-auto">
      <AnimatePresence>
        {toast && <Toast message={toast.message} type={toast.type} />}
      </AnimatePresence>

      <AnimatePresence>
        {showEdit && (
          <EditStudentModal
            student={student}
            onClose={() => setShowEdit(false)}
            onSaved={handleSaved}
          />
        )}
      </AnimatePresence>

      <div className="flex items-center justify-between flex-wrap gap-3">
        <Link href="/students"
          className="inline-flex items-center gap-2 text-sm text-[var(--muted)] hover:text-[var(--text)] transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back to Students
        </Link>
        <div className="flex gap-2">
          {isAdmin && (
            <button onClick={() => setShowEdit(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[var(--surface)] border border-[var(--border)] text-sm text-[var(--muted)] hover:text-[var(--text)] hover:border-brand-400/40 transition-all">
              <Edit2 className="w-4 h-4" /> Edit Student
            </button>
          )}
          <button onClick={handleExportPDF} disabled={exporting || examGroups.length === 0}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-sm font-medium hover:bg-emerald-500/20 transition-colors disabled:opacity-40">
            {exporting
              ? <><span className="w-4 h-4 border-2 border-emerald-400/30 border-t-emerald-400 rounded-full animate-spin" /> Generating…</>
              : <><Download className="w-4 h-4" /> Download PDF</>}
          </button>
        </div>
      </div>

      <motion.div
        className="glass rounded-2xl p-6 border border-[var(--border)] flex flex-col sm:flex-row items-start sm:items-center gap-5"
        initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
      >
        {student.profilePhoto ? (
          <Image src={student.profilePhoto} alt={student.fullName}
            width={80} height={80}
            className="rounded-2xl object-cover ring-2 ring-brand-500/30 flex-shrink-0" />
        ) : (
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-brand-500 to-purple-600 flex items-center justify-center text-white font-bold text-2xl flex-shrink-0">
            {student.fullName[0]}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <h1 className="font-display text-2xl font-bold text-[var(--text)]">{student.fullName}</h1>
          <p className="text-[var(--muted)] text-sm mt-0.5">
            Roll #{student.rollNumber} · Division {student.division}
          </p>
          <div className="flex flex-wrap gap-2 mt-3">
            <span className="px-2.5 py-1 rounded-full bg-brand-500/10 text-brand-400 text-xs border border-brand-500/20 font-mono">
              Class {student.class}
            </span>
            <span className="px-2.5 py-1 rounded-full bg-purple-500/10 text-purple-400 text-xs border border-purple-500/20 font-mono">
              {student.division}
            </span>
            <span className="px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 text-xs border border-emerald-500/20 font-mono">
              {student.stream || "Stream Not Assigned"}
            </span>
            {student.email && (
              <span className="px-2.5 py-1 rounded-full bg-[var(--border)]/40 text-[var(--muted)] text-xs border border-[var(--border)] font-mono">
                {student.email}
              </span>
            )}
            <span className="px-2.5 py-1 rounded-full bg-[var(--border)]/40 text-[var(--muted)] text-xs border border-[var(--border)] font-mono">
              {presentMarks.length} tests
            </span>
          </div>
        </div>
        <div className="text-right flex-shrink-0">
          <p className={`font-bold leading-none ${getPercentageColor(overallPct)}`}
            style={{ fontSize: 42, fontVariantNumeric: "normal", fontFamily: "system-ui" }}>
            {overallPct}%
          </p>
          <p className="text-xs text-[var(--muted)] mt-1">Overall Score</p>
        </div>
      </motion.div>

      {(overallGrowth || growthData) && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {overallGrowth && (
            <motion.div
              className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5"
              initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
            >
              <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
                <div>
                  <h3 className="font-bold text-[var(--text)]">Overall Growth</h3>
                  <p className="text-xs text-[var(--muted)] mt-0.5">
                    First → Latest · {overallGrowth.totalExams} exams
                  </p>
                </div>
                <div className={`flex flex-col items-center px-4 py-2.5 rounded-2xl border-2 ${
                  overallGrowth.value > 0 ? "bg-emerald-500/10 border-emerald-500/30" :
                  overallGrowth.value < 0 ? "bg-red-500/10 border-red-500/30" :
                  "bg-[var(--border)]/20 border-[var(--border)]"
                }`}>
                  <div className={`flex items-center gap-1.5 text-xl font-bold font-mono ${
                    overallGrowth.value > 0 ? "text-emerald-400" :
                    overallGrowth.value < 0 ? "text-red-400" : "text-[var(--muted)]"
                  }`}>
                    {overallGrowth.value > 0 ? <TrendingUp className="w-5 h-5" /> :
                     overallGrowth.value < 0 ? <TrendingDown className="w-5 h-5" /> :
                     <Minus className="w-4 h-4" />}
                    {overallGrowth.value > 0 ? "+" : ""}{overallGrowth.value}%
                  </div>
                  <p className="text-[10px] text-[var(--muted)] mt-0.5">All Exams</p>
                </div>
              </div>

              <div className="flex items-center gap-2 flex-wrap mb-4">
                <div className="text-center px-3 py-2 rounded-xl bg-[var(--bg)] border border-[var(--border)]">
                  <p className="text-[10px] text-[var(--muted)] font-mono truncate max-w-[100px]">
                    {overallGrowth.from}
                  </p>
                  <p className={`font-bold text-sm font-mono ${getPercentageColor(overallGrowth.firstPct)}`}>
                    {overallGrowth.firstPct}%
                  </p>
                </div>
                <span className="text-[var(--muted)]">→</span>
                <div className="text-center px-3 py-2 rounded-xl bg-[var(--bg)] border border-[var(--border)]">
                  <p className="text-[10px] text-[var(--muted)] font-mono truncate max-w-[100px]">
                    {overallGrowth.to}
                  </p>
                  <p className={`font-bold text-sm font-mono ${getPercentageColor(overallGrowth.lastPct)}`}>
                    {overallGrowth.lastPct}%
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {SUBJECTS.map(sub => {
                  const val = overallGrowth.subjectGrowth[sub] as number | null;
                  if (val === null) {
                    return (
                      <div key={sub} className="flex flex-col items-center p-2 rounded-xl bg-[var(--bg)] border border-[var(--border)]">
                        <p className="text-[10px] font-bold" style={{ color: SUBJECT_COLORS[sub] }}>{sub}</p>
                        <p className="text-xs text-[var(--muted)] font-mono">N/A</p>
                      </div>
                    );
                  }
                  return <GrowthBadge key={sub} value={val} label={sub} />;
                })}
              </div>
            </motion.div>
          )}

          {growthData && (
            <motion.div
              className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5"
              initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
            >
              <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
                <div>
                  <h3 className="font-bold text-[var(--text)]">Growth from Last 3 Exams</h3>
                  <p className="text-xs text-[var(--muted)] mt-0.5">
                    {growthData.examNames[0]} → {growthData.examNames[growthData.examNames.length - 1]}
                  </p>
                </div>
                <div className={`flex flex-col items-center px-4 py-2.5 rounded-2xl border-2 ${
                  growthData.overall > 0 ? "bg-emerald-500/10 border-emerald-500/30" :
                  growthData.overall < 0 ? "bg-red-500/10 border-red-500/30" :
                  "bg-[var(--border)]/20 border-[var(--border)]"
                }`}>
                  <div className={`flex items-center gap-1.5 text-xl font-bold font-mono ${
                    growthData.overall > 0 ? "text-emerald-400" :
                    growthData.overall < 0 ? "text-red-400" : "text-[var(--muted)]"
                  }`}>
                    {growthData.overall > 0 ? <TrendingUp className="w-5 h-5" /> :
                     growthData.overall < 0 ? <TrendingDown className="w-5 h-5" /> :
                     <Minus className="w-4 h-4" />}
                    {growthData.overall > 0 ? "+" : ""}{growthData.overall}%
                  </div>
                  <p className="text-[10px] text-[var(--muted)] mt-0.5">Last 3</p>
                </div>
              </div>

              <div className="flex items-center gap-2 mb-4 flex-wrap">
                {growthData.pcts.map((pct, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <div className="text-center px-3 py-2 rounded-xl bg-[var(--bg)] border border-[var(--border)]">
                      <p className="text-[10px] text-[var(--muted)] font-mono truncate max-w-[80px]">
                        {growthData.examNames[i]}
                      </p>
                      <p className={`font-bold text-sm font-mono ${getPercentageColor(pct)}`}>
                        {pct}%
                      </p>
                    </div>
                    {i < growthData.pcts.length - 1 && <span className="text-[var(--muted)]">→</span>}
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {SUBJECTS.map(sub => {
                  const val = growthData.subjectGrowth[sub] as number | null;
                  if (val === null) {
                    return (
                      <div key={sub} className="flex flex-col items-center p-2 rounded-xl bg-[var(--bg)] border border-[var(--border)]">
                        <p className="text-[10px] font-bold" style={{ color: SUBJECT_COLORS[sub] }}>{sub}</p>
                        <p className="text-xs text-[var(--muted)] font-mono">N/A</p>
                      </div>
                    );
                  }
                  return <GrowthBadge key={sub} value={val} label={sub} />;
                })}
              </div>
            </motion.div>
          )}
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: "Overall %", value: `${overallPct}%` },
          { label: "Tests Taken", value: presentMarks.length },
          { label: "Best Subject", value: bestSubject?.slice(0, 4) || "—" },
          { label: "Weak Subject", value: weakSubject?.slice(0, 4) || "—" },
        ].map((m, i) => (
          <motion.div key={m.label}
            className="glass rounded-2xl p-4 border border-[var(--border)] text-center"
            initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 + i * 0.04 }}>
            <p className="font-bold text-xl text-[var(--text)]"
              style={{ fontVariantNumeric: "normal", fontFamily: "system-ui" }}>{m.value}</p>
            <p className="text-xs text-[var(--muted)] mt-0.5">{m.label}</p>
          </motion.div>
        ))}
      </div>

      {examGroups.length >= 1 && (
        <motion.div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5"
          initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
          <h3 className="font-bold text-[var(--text)] text-sm mb-0.5">Overall Frequency Polygon</h3>
          <p className="text-xs text-[var(--muted)] mb-4">
            Each subject has its own independent line · exams chronological
          </p>
          <SubjectFreqPolygon data={studentChartData} mode="student" height={280} />
        </motion.div>
      )}

      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
        <div className="mb-3">
          <h3 className="font-bold text-[var(--text)]">Subject-wise Frequency Polygons</h3>
          <p className="text-xs text-[var(--muted)] mt-0.5">Only exams for that subject shown</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {SUBJECTS.map((sub, i) => {
            const pts = studentChartData[sub];
            const avg = pts.length
              ? Math.round(pts.reduce((s, p) => s + p.percentage, 0) / pts.length * 10) / 10 : 0;
            const growth = pts.length >= 2
              ? Math.round((pts[pts.length - 1].percentage - pts[0].percentage) * 10) / 10 : null;
            const singleData: SubjectData = {
              Physics: sub === "Physics" ? pts : [],
              Chemistry: sub === "Chemistry" ? pts : [],
              Mathematics: sub === "Mathematics" ? pts : [],
              Biology: sub === "Biology" ? pts : [],
            };
            return (
              <motion.div key={sub}
                className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5"
                style={{ borderLeftColor: SUBJECT_COLORS[sub], borderLeftWidth: 3 }}
                initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.22 + i * 0.06 }}>
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <p className="font-bold text-sm" style={{ color: SUBJECT_COLORS[sub] }}>{sub}</p>
                    <p className="text-xs text-[var(--muted)]">
                      {pts.length > 0
                        ? `Avg: ${avg}% · ${pts.length} exam${pts.length !== 1 ? "s" : ""}`
                        : "No data yet"}
                    </p>
                  </div>
                  {growth !== null && (
                    <div className={`flex items-center gap-1 text-xs font-mono font-bold px-2.5 py-1 rounded-full border ${
                      growth > 0 ? "text-emerald-400 bg-emerald-500/10 border-emerald-500/20"
                      : growth < 0 ? "text-red-400 bg-red-500/10 border-red-500/20"
                      : "text-[var(--muted)] bg-[var(--border)]/20 border-[var(--border)]"
                    }`}>
                      {growth > 0 ? <TrendingUp className="w-3 h-3" /> :
                       growth < 0 ? <TrendingDown className="w-3 h-3" /> : <Minus className="w-3 h-3" />}
                      {growth > 0 ? "+" : ""}{growth}%
                    </div>
                  )}
                </div>
                <SubjectFreqPolygon data={singleData} mode="student" height={160} />
              </motion.div>
            );
          })}
        </div>
      </motion.div>

      {/* Full Exam History — topics show as Electrostatics I / II when repeated */}
      {examGroups.length > 0 && (
        <motion.div className="glass rounded-2xl border border-[var(--border)] overflow-hidden"
          initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}>
          <div className="px-5 py-4 border-b border-[var(--border)] flex items-center justify-between">
            <h3 className="font-bold text-[var(--text)] text-sm">Full Exam History</h3>
            <span className="text-xs text-[var(--muted)] font-mono">{examGroups.length} exams</span>
          </div>
          <div className="divide-y divide-[var(--border)]">
            {[...examGroups].reverse().map(({ examId, name, date, marks: eMarks }) => {
              const pm = eMarks.filter(m => m.status === "present" && m.obtainedMarks !== null);
              const tot = pm.reduce((s, m) => s + m.maximumMarks, 0);
              const obt = pm.reduce((s, m) => s + (m.obtainedMarks ?? 0), 0);
              const pct = calcPercentage(obt, tot);

              // Primary topic label for the row (first mark with a topic)
              const primaryTopic = eMarks
                .map(m => topicDisplayLabel(m.subject, m.topic, examId, topicOccurrenceMap))
                .find(t => t);

              return (
                <div key={examId}
                  className="px-5 py-3 flex items-center justify-between gap-4 hover:bg-[var(--border)]/20 transition-colors">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-[var(--text)]">{name}</p>
                    <p className="text-xs text-[var(--muted)]">
                      {date}
                      {primaryTopic && (
                        <span className="text-brand-400 font-mono"> · {primaryTopic}</span>
                      )}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 flex-wrap">
                    {eMarks.map((m, idx) => {
                      const labeled = topicDisplayLabel(
                        m.subject,
                        m.topic,
                        examId,
                        topicOccurrenceMap
                      );
                      return (
                        <div key={idx} className="text-center hidden sm:block">
                          <p
                            className="text-[10px] font-mono font-bold"
                            style={{
                              color:
                                SUBJECT_COLORS[m.subject as keyof typeof SUBJECT_COLORS] ||
                                "#6b7280",
                            }}
                          >
                            {m.subject.slice(0, 4)}
                          </p>
                          {labeled && (
                            <p className="text-[9px] text-[var(--muted)] font-mono truncate max-w-[72px]">
                              {labeled}
                            </p>
                          )}
                          <p className="text-xs font-mono text-[var(--text)]">
                            {m.status === "present"
                              ? `${m.obtainedMarks}/${m.maximumMarks}`
                              : <span className="text-red-400">{m.status}</span>}
                          </p>
                        </div>
                      );
                    })}
                    <div className="text-right min-w-[60px]">
                      <p className={`font-mono font-bold text-sm ${getPercentageColor(pct)}`}
                        style={{ fontVariantNumeric: "normal", fontFamily: "system-ui" }}>
                        {tot > 0 ? `${pct}%` : "—"}
                      </p>
                      <p className="text-xs text-[var(--muted)]">{tot > 0 ? `${obt}/${tot}` : ""}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </motion.div>
      )}
    </div>
  );
}