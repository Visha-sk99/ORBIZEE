"use client";
// Force clear institute config cache on settings save

import { clearInstituteCache } from "@/hooks/useInstituteConfig";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  User, Moon, Sun, Shield, Plus, Trash2,
  GraduationCap, Save, CheckCircle2, X, Edit2,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useTheme } from "@/context/ThemeContext";
import Image from "next/image";
import { db } from "@/firebase/config";
import {
  doc, getDoc, setDoc, Timestamp,
} from "firebase/firestore";
// Add this import

// This should already exist — just make sure cachedConfig is accessible

// ── Types ─────────────────────────────────────────────────────────────────

interface DivisionConfig {
  standard: string;   // e.g. "11", "12"
  divisions: string[]; // e.g. ["A", "B", "C"]
}

interface InstituteConfig {
  standards: DivisionConfig[];
  updatedAt?: string;
}

const DEFAULT_CONFIG: InstituteConfig = {
  standards: [
    { standard: "11", divisions: ["A", "B"] },
    { standard: "12", divisions: ["A", "B"] },
  ],
};

const DOC_REF = "settings/instituteConfig";

// ── Helpers ───────────────────────────────────────────────────────────────

function getDivisionId(standard: string, div: string) {
  return `${standard}${div}`;
}

// ── Main ──────────────────────────────────────────────────────────────────

export default function SettingsPage() {
  const { user, isAdmin } = useAuth();
  const { theme, toggleTheme } = useTheme();

  // Division config state
  const [config, setConfig]         = useState<InstituteConfig>(DEFAULT_CONFIG);
  const [loading, setLoading]       = useState(true);
  const [saving, setSaving]         = useState(false);
  const [saved, setSaved]           = useState(false);

  // Add standard form
  const [newStandard, setNewStandard]   = useState("");
  const [showAddStd, setShowAddStd]     = useState(false);

  // Add division form
  const [addingDivTo, setAddingDivTo]   = useState<string | null>(null);
  const [newDiv, setNewDiv]             = useState("");

  // Edit standard name
  const [editingStd, setEditingStd]     = useState<string | null>(null);
  const [editStdVal, setEditStdVal]     = useState("");

  // Load from Firestore
  useEffect(() => {
    const [col, docId] = DOC_REF.split("/");
    getDoc(doc(db, col, docId)).then(snap => {
      if (snap.exists()) {
        setConfig(snap.data() as InstituteConfig);
      }
      setLoading(false);
    });
  }, []);

  const handleSave = async () => {
    setSaving(true);
    const [col, docId] = DOC_REF.split("/");
    await setDoc(doc(db, col, docId), {
      ...config,
      updatedAt: Timestamp.now().toDate().toISOString(),
    });
    clearInstituteCache();
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  // Add standard
  const handleAddStandard = () => {
    const val = newStandard.trim();
    if (!val) return;
    if (config.standards.find(s => s.standard === val)) return;
    setConfig(c => ({
      ...c,
      standards: [...c.standards, { standard: val, divisions: [] }],
    }));
    setNewStandard("");
    setShowAddStd(false);
  };

  // Remove standard
  const handleRemoveStandard = (std: string) => {
    if (!confirm(`Remove Standard ${std} and all its divisions?`)) return;
    setConfig(c => ({ ...c, standards: c.standards.filter(s => s.standard !== std) }));
  };

  // Add division to a standard
  const handleAddDivision = (std: string) => {
    const val = newDiv.trim().toUpperCase();
    if (!val) return;
    setConfig(c => ({
      ...c,
      standards: c.standards.map(s =>
        s.standard === std && !s.divisions.includes(val)
          ? { ...s, divisions: [...s.divisions, val] }
          : s
      ),
    }));
    setNewDiv("");
    setAddingDivTo(null);
  };

  // Remove division
  const handleRemoveDivision = (std: string, div: string) => {
    setConfig(c => ({
      ...c,
      standards: c.standards.map(s =>
        s.standard === std
          ? { ...s, divisions: s.divisions.filter(d => d !== div) }
          : s
      ),
    }));
  };

  // Rename standard
  const handleRenameStandard = (oldStd: string) => {
    const val = editStdVal.trim();
    if (!val || val === oldStd) { setEditingStd(null); return; }
    if (config.standards.find(s => s.standard === val)) { setEditingStd(null); return; }
    setConfig(c => ({
      ...c,
      standards: c.standards.map(s => s.standard === oldStd ? { ...s, standard: val } : s),
    }));
    setEditingStd(null);
  };

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-6 h-6 border-2 border-brand-400/30 border-t-brand-400 rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="space-y-5 animate-fade-in max-w-2xl mx-auto">
      <div>
        <h1 className="font-display text-xl font-bold text-[var(--text)]">Settings</h1>
        <p className="text-xs text-[var(--muted)]">Account, appearance & institute configuration</p>
      </div>

      {/* ── Profile ──────────────────────────────────────────────── */}
      <motion.div
        className="glass rounded-2xl p-5 border border-[var(--border)]"
        initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
      >
        <h3 className="font-bold text-[var(--text)] mb-4 flex items-center gap-2">
          <User className="w-4 h-4 text-brand-400" /> Profile
        </h3>
        <div className="flex items-center gap-4">
          {user?.photoURL ? (
            <Image src={user.photoURL} alt="Avatar" width={56} height={56} className="rounded-full ring-2 ring-brand-500/30" />
          ) : (
            <div className="w-14 h-14 rounded-full bg-brand-500 flex items-center justify-center text-white font-bold font-display text-xl">
              {user?.displayName?.[0]}
            </div>
          )}
          <div>
            <p className="font-bold text-[var(--text)]">{user?.displayName}</p>
            <p className="text-sm text-[var(--muted)]">{user?.email}</p>
            {isAdmin && (
              <span className="inline-flex mt-1 items-center px-2 py-0.5 rounded-full text-[10px] font-mono bg-brand-500/15 text-brand-400 border border-brand-500/20">
                ADMIN
              </span>
            )}
          </div>
        </div>
      </motion.div>

      {/* ── Appearance ───────────────────────────────────────────── */}
      <motion.div
        className="glass rounded-2xl p-5 border border-[var(--border)]"
        initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
      >
        <h3 className="font-bold text-[var(--text)] mb-4 flex items-center gap-2">
          {theme === "dark" ? <Moon className="w-4 h-4 text-brand-400" /> : <Sun className="w-4 h-4 text-yellow-400" />}
          Appearance
        </h3>
        <div className="flex gap-3">
          {(["dark", "light"] as const).map(t => (
            <button key={t} onClick={() => theme !== t && toggleTheme()}
              className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border text-sm font-medium transition-all ${
                theme === t
                  ? "bg-brand-500 text-white border-brand-500 shadow-md shadow-brand-500/20"
                  : "border-[var(--border)] text-[var(--muted)] hover:text-[var(--text)]"
              }`}>
              {t === "dark" ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
              {t === "dark" ? "Dark Mode" : "Light Mode"}
            </button>
          ))}
        </div>
      </motion.div>

      {/* ── Division Manager ─────────────────────────────────────── */}
      {isAdmin && (
        <motion.div
          className="glass rounded-2xl p-5 border border-[var(--border)]"
          initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
        >
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-bold text-[var(--text)] flex items-center gap-2">
              <GraduationCap className="w-4 h-4 text-brand-400" /> Standards & Divisions
            </h3>
            <button
              onClick={() => setShowAddStd(s => !s)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-brand-500/10 border border-brand-500/20 text-brand-400 text-xs hover:bg-brand-500/20 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" /> Add Standard
            </button>
          </div>
          <p className="text-xs text-[var(--muted)] mb-4">
            Configure classes and their divisions. Changes apply institute-wide.
          </p>

          {/* Add standard form */}
          <AnimatePresence>
            {showAddStd && (
              <motion.div
                className="flex gap-2 mb-4 p-3 rounded-xl bg-brand-500/5 border border-brand-500/20"
                initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
              >
                <input
                  autoFocus
                  value={newStandard}
                  onChange={e => setNewStandard(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && handleAddStandard()}
                  placeholder="Standard name e.g. 11, 12, 9, 10, JEE…"
                  className="flex-1 px-3 py-2 rounded-xl bg-[var(--bg)] border border-[var(--border)] text-sm text-[var(--text)] focus:outline-none focus:border-brand-400/60"
                />
                <button onClick={handleAddStandard}
                  className="px-4 py-2 rounded-xl bg-brand-500 text-white text-sm font-medium hover:bg-brand-600 transition-colors">
                  Add
                </button>
                <button onClick={() => setShowAddStd(false)}
                  className="p-2 rounded-xl text-[var(--muted)] hover:bg-[var(--border)] transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Standards list */}
          <div className="space-y-3">
            {config.standards.length === 0 && (
              <p className="text-sm text-[var(--muted)] text-center py-6">
                No standards configured. Add one above.
              </p>
            )}
            {config.standards.map((std, si) => (
              <motion.div
                key={std.standard}
                className="rounded-xl border border-[var(--border)] bg-[var(--bg)] overflow-hidden"
                initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: si * 0.05 }}
              >
                {/* Standard header */}
                <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border)] bg-[var(--surface)]">
                  <div className="flex items-center gap-2">
                    {editingStd === std.standard ? (
                      <div className="flex items-center gap-2">
                        <input
                          autoFocus
                          value={editStdVal}
                          onChange={e => setEditStdVal(e.target.value)}
                          onKeyDown={e => { if (e.key === "Enter") handleRenameStandard(std.standard); if (e.key === "Escape") setEditingStd(null); }}
                          className="w-28 px-2 py-1 rounded-lg bg-[var(--bg)] border border-brand-400/60 text-sm text-[var(--text)] focus:outline-none font-mono"
                        />
                        <button onClick={() => handleRenameStandard(std.standard)}
                          className="p-1 rounded-lg text-emerald-400 hover:bg-emerald-500/10 transition-colors">
                          <CheckCircle2 className="w-4 h-4" />
                        </button>
                        <button onClick={() => setEditingStd(null)}
                          className="p-1 rounded-lg text-[var(--muted)] hover:bg-[var(--border)] transition-colors">
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <>
                        <span className="font-bold text-[var(--text)]">Standard {std.standard}</span>
                        <span className="text-xs text-[var(--muted)] font-mono">
                          {std.divisions.length} division{std.divisions.length !== 1 ? "s" : ""}
                        </span>
                        <button
                          onClick={() => { setEditingStd(std.standard); setEditStdVal(std.standard); }}
                          className="p-1 rounded-lg text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--border)] transition-colors"
                        >
                          <Edit2 className="w-3 h-3" />
                        </button>
                      </>
                    )}
                  </div>
                  <button
                    onClick={() => handleRemoveStandard(std.standard)}
                    className="p-1.5 rounded-lg text-red-400 hover:bg-red-500/10 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Divisions */}
                <div className="p-4">
                  <div className="flex flex-wrap gap-2 mb-3">
                    {std.divisions.length === 0 && (
                      <p className="text-xs text-[var(--muted)]">No divisions yet — add one below.</p>
                    )}
                    {std.divisions.map(div => (
                      <div key={div}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-brand-500/10 border border-brand-500/20 group"
                      >
                        <span className="text-brand-400 font-mono font-bold text-sm">
                          {getDivisionId(std.standard, div)}
                        </span>
                        <button
                          onClick={() => handleRemoveDivision(std.standard, div)}
                          className="text-[var(--muted)] hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>

                  {/* Add division */}
                  {addingDivTo === std.standard ? (
                    <div className="flex gap-2">
                      <input
                        autoFocus
                        value={newDiv}
                        onChange={e => setNewDiv(e.target.value.toUpperCase())}
                        onKeyDown={e => { if (e.key === "Enter") handleAddDivision(std.standard); if (e.key === "Escape") setAddingDivTo(null); }}
                        placeholder="Division letter e.g. A, B, C…"
                        maxLength={4}
                        className="flex-1 px-3 py-2 rounded-xl bg-[var(--surface)] border border-[var(--border)] text-sm text-[var(--text)] focus:outline-none focus:border-brand-400/60 font-mono uppercase"
                      />
                      <button
                        onClick={() => handleAddDivision(std.standard)}
                        className="px-3 py-2 rounded-xl bg-brand-500 text-white text-xs font-medium hover:bg-brand-600 transition-colors"
                      >
                        Add
                      </button>
                      <button
                        onClick={() => { setAddingDivTo(null); setNewDiv(""); }}
                        className="p-2 rounded-xl text-[var(--muted)] hover:bg-[var(--border)] transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => { setAddingDivTo(std.standard); setNewDiv(""); }}
                      className="flex items-center gap-1.5 text-xs text-[var(--muted)] hover:text-brand-400 transition-colors"
                    >
                      <Plus className="w-3.5 h-3.5" /> Add Division
                    </button>
                  )}
                </div>

                {/* Division preview */}
                {std.divisions.length > 0 && (
                  <div className="px-4 py-2 border-t border-[var(--border)] bg-[var(--surface)]/50">
                    <p className="text-[10px] text-[var(--muted)] font-mono">
                      Full IDs: {std.divisions.map(d => getDivisionId(std.standard, d)).join(", ")}
                    </p>
                  </div>
                )}
              </motion.div>
            ))}
          </div>

          {/* Save button */}
          <div className="mt-4 flex items-center gap-3">
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-brand-500 text-white text-sm font-medium hover:bg-brand-600 transition-colors disabled:opacity-50 shadow-md shadow-brand-500/20"
            >
              {saving
                ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Saving…</>
                : saved
                ? <><CheckCircle2 className="w-4 h-4" /> Saved!</>
                : <><Save className="w-4 h-4" /> Save Configuration</>
              }
            </button>
            <p className="text-xs text-[var(--muted)]">
              Saved to Firestore — applies institute-wide
            </p>
          </div>
        </motion.div>
      )}

      {/* ── Access Level ─────────────────────────────────────────── */}
      <motion.div
        className="glass rounded-2xl p-5 border border-[var(--border)]"
        initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
      >
        <h3 className="font-bold text-[var(--text)] mb-3 flex items-center gap-2">
          <Shield className="w-4 h-4 text-emerald-400" /> Access Level
        </h3>
        <p className="text-sm text-[var(--muted)]">
          {isAdmin
            ? "You have full admin access — manage students, exams, marks, and rankings."
            : "You have read-only access. Contact an admin to request elevated permissions."}
        </p>
      </motion.div>
    </div>
  );
}