"use client";
import { useState, useMemo } from "react";
import { STREAMS } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Search, Trash2, X, CheckCircle2 } from "lucide-react";
import { useStudents } from "@/hooks/useStudents";
import { useAllMarks } from "@/hooks/useMarks";
import { useAuth } from "@/hooks/useAuth";
import { useInstituteConfig } from "@/hooks/useInstituteConfig";
import StudentCard from "@/components/ui/StudentCard";
import { addStudent, deleteStudent } from "@/services/studentService";
import { computeRankings } from "@/services/rankingService";
import type { Student, Stream } from "@/types";

function blankForm(division: string, cls: string): Omit<Student, "id"> {
  return {
    fullName: "",
    rollNumber: "",
    profilePhoto: "",
    class: cls as Student["class"],
    division: division as Student["division"],
    stream: undefined,   // instead of "" as Stream | ""
    parentName: "",
    parentContact: "",
    email: "",
    admissionDate: "",
  };
}

export default function StudentsPage() {
  const { students, loading, refresh } = useStudents();
  const { marks } = useAllMarks();
  const { isAdmin } = useAuth();
  const { allDivisions, allStandards, divisionsForStandard, loading: configLoading } = useInstituteConfig();

  const [search, setSearch] = useState("");
  const [divFilter, setDivFilter] = useState<string>("All");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<Omit<Student, "id">>(() => blankForm("12A", "12"));
  const [saving, setSaving] = useState(false);
  const [justSaved, setJustSaved] = useState(false);
  const [savedCount, setSavedCount] = useState(0);

  const nameInputRef = { current: null as HTMLInputElement | null };

  const rankings = useMemo(() => computeRankings(students, marks), [students, marks]);
  const rankMap = useMemo(() => {
    const m = new Map<string, { percentage: number; rank: number }>();
    rankings.forEach(r => m.set(r.studentId, { percentage: r.percentage, rank: r.rank }));
    return m;
  }, [rankings]);

  const filtered = useMemo(() => {
    let list = students;
    if (divFilter !== "All") list = list.filter(s => s.division === divFilter);
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(s =>
        s.fullName.toLowerCase().includes(q) || s.rollNumber.includes(q)
      );
    }
    return list;
  }, [students, search, divFilter]);

  const updateField = (key: keyof Omit<Student, "id">, value: string) =>
    setForm(f => ({ ...f, [key]: value }));

  const handleClassChange = (cls: string) => {
    const divs = divisionsForStandard(cls);
    const firstDiv = divs[0] || "";
    setForm(f => ({
      ...f,
      class: cls as Student["class"],
      division: firstDiv as Student["division"],
    }));
  };

  const handleDivisionChange = (div: string) => {
    const std = allStandards.find(s => div.startsWith(s)) || "";
    setForm(f => ({
      ...f,
      division: div as Student["division"],
      class: std as Student["class"],
    }));
  };

  const handleAdd = async () => {
    if (!form.fullName.trim() || !form.rollNumber.trim() || !form.stream) return;
    if (saving) return;
    setSaving(true);
    try {
      await addStudent(form);
      await refresh();
      setSavedCount(c => c + 1);
      setJustSaved(true);
      setTimeout(() => setJustSaved(false), 1800);
      setForm(prev => blankForm(prev.division, prev.class));
      requestAnimationFrame(() => nameInputRef.current?.focus());
    } catch (err) {
      console.error("Failed to add student:", err);
      alert("Failed to save. Check console.");
    } finally {
      setSaving(false);
    }
  };

  const handleFormKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      e.stopPropagation();
      handleAdd();
    }
  };

  const openForm = () => {
    setSavedCount(0);
    setShowForm(true);
  };
  const closeForm = () => setShowForm(false);

  const formDivisions = divisionsForStandard(form.class);

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-xl font-bold text-[var(--text)]">Students</h1>
          <p className="text-xs text-[var(--muted)]">{students.length} total</p>
        </div>
        {isAdmin && (
          <button
            onClick={openForm}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-brand-500 text-white text-sm font-medium hover:bg-brand-600 transition-colors"
          >
            <Plus className="w-4 h-4" /> Add Student
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--muted)]" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by name or roll number…"
            className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-[var(--surface)] border border-[var(--border)] text-sm text-[var(--text)] placeholder:text-[var(--muted)] focus:outline-none focus:border-brand-400/60"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => setDivFilter("All")}
            className={`px-3 py-2 rounded-xl text-xs font-medium transition-colors ${
              divFilter === "All"
                ? "bg-brand-500 text-white"
                : "bg-[var(--surface)] border border-[var(--border)] text-[var(--muted)] hover:text-[var(--text)]"
            }`}
          >
            All
          </button>
          {allDivisions.map(d => (
            <button
              key={d}
              onClick={() => setDivFilter(d)}
              className={`px-3 py-2 rounded-xl text-xs font-medium transition-colors ${
                divFilter === d
                  ? "bg-brand-500 text-white"
                  : "bg-[var(--surface)] border border-[var(--border)] text-[var(--muted)] hover:text-[var(--text)]"
              }`}
            >
              {d}
            </button>
          ))}
        </div>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
        {loading
          ? [...Array(8)].map((_, i) => (
              <div key={i} className="h-20 rounded-2xl bg-[var(--border)] animate-pulse" />
            ))
          : filtered.map((s, i) => {
              const r = rankMap.get(s.id);
              return (
                <div key={s.id} className="relative group">
                  <StudentCard
                    student={s}
                    percentage={r?.percentage}
                    rank={r?.rank}
                    delay={i * 0.02}
                  />
                  {isAdmin && (
                    <button
                      onClick={async e => {
                        e.preventDefault();
                        if (confirm("Delete student?")) {
                          await deleteStudent(s.id);
                          refresh();
                        }
                      }}
                      className="absolute top-2 right-2 p-1.5 rounded-lg bg-red-500/10 text-red-400 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500/20"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  )}
                </div>
              );
            })}
      </div>

      {/* Add Student Modal */}
      <AnimatePresence>
        {showForm && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={e => {
              if (e.target === e.currentTarget) {
                /* no-op */
              }
            }}
          >
            <motion.div
              className="w-full max-w-lg bg-[var(--surface)] rounded-2xl border border-[var(--border)] p-6 shadow-2xl max-h-[90vh] overflow-y-auto"
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              onKeyDown={handleFormKeyDown}
              onClick={e => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between mb-1">
                <h3 className="font-display font-bold text-[var(--text)]">Add Student</h3>
                <button
                  type="button"
                  onClick={closeForm}
                  className="p-1.5 rounded-lg text-[var(--muted)] hover:bg-[var(--border)]"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="flex items-center justify-between mb-5">
                <p className="text-xs text-[var(--muted)]">
                  {savedCount > 0
                    ? `${savedCount} added this session`
                    : "Fill the form to add students continuously"}
                </p>
                <span className="px-2.5 py-1 rounded-full bg-brand-500/10 text-brand-400 text-xs font-mono border border-brand-500/20">
                  Adding to {form.division}
                </span>
              </div>

              {/* Class + Division + Stream */}
              <div className="grid grid-cols-2 gap-3 mb-4 p-3 rounded-xl bg-brand-500/5 border border-brand-500/15">
                {/* Class / Standard */}
                <div>
                  <label className="text-xs text-[var(--muted)] mb-1 block">
                    Class / Standard
                  </label>
                  {configLoading ? (
                    <div className="h-9 rounded-xl bg-[var(--border)] animate-pulse" />
                  ) : (
                    <select
                      value={form.class}
                      onChange={e => handleClassChange(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-[var(--bg)] border border-[var(--border)] text-sm text-[var(--text)] focus:outline-none focus:border-brand-400/60"
                    >
                      {allStandards.map(s => (
                        <option key={s} value={s}>
                          Standard {s}
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                {/* Division */}
                <div>
                  <label className="text-xs text-[var(--muted)] mb-1 block">Division</label>
                  {configLoading ? (
                    <div className="h-9 rounded-xl bg-[var(--border)] animate-pulse" />
                  ) : formDivisions.length === 0 ? (
                    <div className="px-3 py-2 rounded-xl bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 text-xs">
                      No divisions for Standard {form.class}. Add in Settings.
                    </div>
                  ) : (
                    <select
                      value={form.division}
                      onChange={e => handleDivisionChange(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-[var(--bg)] border border-[var(--border)] text-sm text-[var(--text)] focus:outline-none focus:border-brand-400/60"
                    >
                      {formDivisions.map(d => (
                        <option key={d} value={d}>
                          {d}
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                {/* Stream */}
                <div className="col-span-2">
                  <label className="text-xs text-[var(--muted)] mb-1 block">
                    Stream <span className="text-red-400">*</span>
                  </label>
                  <select
                    value={form.stream || ""}
                    onChange={e => updateField("stream", e.target.value || undefined as any)}
                    className="w-full px-3 py-2 rounded-xl bg-[var(--bg)] border border-[var(--border)] text-sm text-[var(--text)] focus:outline-none focus:border-brand-400/60"
                  >
                    <option value="">Select Stream</option>
                    {STREAMS.map(s => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Personal fields */}
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="text-xs text-[var(--muted)] mb-1 block">Full Name</label>
                  <input
                    ref={el => {
                      nameInputRef.current = el;
                    }}
                    autoFocus
                    value={form.fullName}
                    onChange={e => updateField("fullName", e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-[var(--bg)] border border-[var(--border)] text-sm text-[var(--text)] focus:outline-none focus:border-brand-400/60"
                  />
                </div>
                <div>
                  <label className="text-xs text-[var(--muted)] mb-1 block">Roll Number</label>
                  <input
                    value={form.rollNumber}
                    onChange={e => updateField("rollNumber", e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-[var(--bg)] border border-[var(--border)] text-sm text-[var(--text)] focus:outline-none focus:border-brand-400/60"
                  />
                </div>
                <div>
                  <label className="text-xs text-[var(--muted)] mb-1 block">Email</label>
                  <input
                    value={form.email}
                    onChange={e => updateField("email", e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-[var(--bg)] border border-[var(--border)] text-sm text-[var(--text)] focus:outline-none focus:border-brand-400/60"
                  />
                </div>
                <div>
                  <label className="text-xs text-[var(--muted)] mb-1 block">Parent Name</label>
                  <input
                    value={form.parentName}
                    onChange={e => updateField("parentName", e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-[var(--bg)] border border-[var(--border)] text-sm text-[var(--text)] focus:outline-none focus:border-brand-400/60"
                  />
                </div>
                <div>
                  <label className="text-xs text-[var(--muted)] mb-1 block">Parent Contact</label>
                  <input
                    value={form.parentContact}
                    onChange={e => updateField("parentContact", e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-[var(--bg)] border border-[var(--border)] text-sm text-[var(--text)] focus:outline-none focus:border-brand-400/60"
                  />
                </div>
                <div>
                  <label className="text-xs text-[var(--muted)] mb-1 block">Admission Date</label>
                  <input
                    type="date"
                    value={form.admissionDate}
                    onChange={e => updateField("admissionDate", e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-[var(--bg)] border border-[var(--border)] text-sm text-[var(--text)] focus:outline-none focus:border-brand-400/60"
                  />
                </div>
                <div className="col-span-2">
                  <label className="text-xs text-[var(--muted)] mb-1 block">Photo URL</label>
                  <input
                    value={form.profilePhoto}
                    onChange={e => updateField("profilePhoto", e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-[var(--bg)] border border-[var(--border)] text-sm text-[var(--text)] focus:outline-none focus:border-brand-400/60"
                  />
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3 mt-5">
                <button
                  type="button"
                  onClick={closeForm}
                  className="flex-1 py-2.5 rounded-xl border border-[var(--border)] text-sm text-[var(--muted)] hover:text-[var(--text)] transition-colors"
                >
                  Done
                </button>
                <button
                  type="button"
                  onClick={handleAdd}
                  disabled={
                    saving ||
                    !form.fullName.trim() ||
                    !form.rollNumber.trim() ||
                    !form.division ||
                    !form.stream
                  }
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-brand-500 text-white text-sm font-medium hover:bg-brand-600 transition-colors disabled:opacity-50"
                >
                  {justSaved ? (
                    <>
                      <CheckCircle2 className="w-4 h-4" /> Saved
                    </>
                  ) : saving ? (
                    "Saving…"
                  ) : (
                    "Add Student"
                  )}
                </button>
              </div>

              <p className="text-center text-[10px] text-[var(--muted)] mt-3">
                Tip: Press{" "}
                <kbd className="px-1.5 py-0.5 rounded bg-[var(--bg)] border border-[var(--border)] font-mono">
                  Enter
                </kbd>{" "}
                to save and keep adding
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}