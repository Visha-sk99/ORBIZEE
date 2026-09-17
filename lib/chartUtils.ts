import type { Mark, Exam } from "@/types";

export const SUBJECT_COLORS: Record<string, string> = {
  Physics:     "#6b8eff",
  Chemistry:   "#a855f7",
  Mathematics: "#10b981",
  Biology:     "#f59e0b",
};

export const SUBJECTS = ["Physics", "Chemistry", "Mathematics", "Biology"] as const;
export type SubjectKey = typeof SUBJECTS[number];

export function normalizeSubject(raw: string | undefined | null): SubjectKey | null {
  if (!raw) return null;
  const s = raw.trim().toLowerCase();
  if (s === "physics" || s.startsWith("phys")) return "Physics";
  if (s === "chemistry" || s.startsWith("chem")) return "Chemistry";
  if (s === "mathematics" || s === "maths" || s === "math" || s.startsWith("math")) return "Mathematics";
  if (s === "biology" || s.startsWith("bio")) return "Biology";
  return null;
}

export interface ChartPoint {
  examId:     string;
  examName:   string;
  topic:      string;
  date:       string;
  percentage: number;
  obtained:   number;
  maximum:    number;
}

export type SubjectData = Record<SubjectKey, ChartPoint[]>;

const ROMANS = [
  "I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X",
  "XI", "XII", "XIII", "XIV", "XV", "XVI", "XVII", "XVIII", "XIX", "XX",
];

/** Strip trailing Roman so "GOC II" and "GOC" share one key */
function baseTopic(topic: string): string {
  return topic
    .trim()
    .replace(/\s+(I{1,3}|IV|VI{0,3}|IX|X{1,3}|XI{0,3}|XIV|XV|XVI{0,3}|XIX|XX)$/i, "")
    .trim();
}

/**
 * Same topic within one subject → Topic I, Topic II… (chronological)
 */
function applyTopicRomans(points: ChartPoint[]): ChartPoint[] {
  const counts = new Map<string, number>();
  points.forEach(p => {
    const base = baseTopic(p.topic || "");
    if (!base) return;
    const key = base.toLowerCase();
    counts.set(key, (counts.get(key) || 0) + 1);
  });

  const seen = new Map<string, number>();
  return points.map(p => {
    const base = baseTopic(p.topic || "");
    if (!base) return p;
    const key = base.toLowerCase();
    if ((counts.get(key) || 0) <= 1) {
      return { ...p, topic: base };
    }
    const n = (seen.get(key) || 0) + 1;
    seen.set(key, n);
    const roman = ROMANS[n - 1] || String(n);
    return { ...p, topic: `${base} ${roman}` };
  });
}

// ── Build per-subject chart data for ONE student ──────────────────────────
export function buildStudentChartData(
  marks: Mark[],
  exams: Exam[]
): SubjectData {
  const result: SubjectData = {
    Physics: [], Chemistry: [], Mathematics: [], Biology: [],
  };

  const valid = marks.filter(
    m =>
      m.status === "present" &&
      m.obtainedMarks !== null &&
      m.maximumMarks > 0
  );

  valid.forEach(m => {
    let sub = normalizeSubject(m.subject);

    if (!sub) {
      const exam = exams.find(e => e.id === m.examId);
      if (exam?.subjects?.length) {
        sub = normalizeSubject(exam.subjects[0].subject);
      }
    }

    if (!sub) return;

    const exam = exams.find(e => e.id === m.examId);
    const pct = Math.round((m.obtainedMarks! / m.maximumMarks) * 1000) / 10;

    const topicFromExam =
      exam?.subjects?.find(s => normalizeSubject(s.subject) === sub)?.topic || "";

    result[sub].push({
      examId:     m.examId,
      examName:   exam?.examName || m.examId,
      topic:      m.topic || topicFromExam || "",
      date:       m.date || exam?.date || "",
      percentage: pct,
      obtained:   m.obtainedMarks!,
      maximum:    m.maximumMarks,
    });
  });

  SUBJECTS.forEach(sub => {
    result[sub].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    const seen = new Set<string>();
    result[sub] = result[sub].filter(p => {
      if (seen.has(p.examId)) return false;
      seen.add(p.examId);
      return true;
    });

    // Electrostatics I / II when same topic repeats
    result[sub] = applyTopicRomans(result[sub]);
  });

  return result;
}

// ── Build per-subject chart data for CLASS AVERAGE (dashboard) ────────────
export function buildClassChartData(
  marks: Mark[],
  exams: Exam[]
): SubjectData {
  const result: SubjectData = {
    Physics: [], Chemistry: [], Mathematics: [], Biology: [],
  };

  const grouped = new Map<string, {
    marks: Mark[];
    exam: Exam | undefined;
    sub: SubjectKey;
  }>();

  marks
    .filter(m => m.status === "present" && m.obtainedMarks !== null && m.maximumMarks > 0)
    .forEach(m => {
      let sub = normalizeSubject(m.subject);

      if (!sub) {
        const exam = exams.find(e => e.id === m.examId);
        if (exam?.subjects?.length) {
          sub = normalizeSubject(exam.subjects[0].subject);
        }
      }

      if (!sub) return;

      const key = `${m.examId}__${sub}`;
      if (!grouped.has(key)) {
        grouped.set(key, {
          marks: [],
          exam: exams.find(e => e.id === m.examId),
          sub,
        });
      }
      grouped.get(key)!.marks.push(m);
    });

  grouped.forEach(({ marks: grpMarks, exam, sub }) => {
    const totalObt = grpMarks.reduce((s, m) => s + (m.obtainedMarks ?? 0), 0);
    const totalMax = grpMarks.reduce((s, m) => s + m.maximumMarks, 0);
    const avg = Math.round((totalObt / totalMax) * 1000) / 10;

    const topicFromExam =
      exam?.subjects?.find(s => normalizeSubject(s.subject) === sub)?.topic || "";

    result[sub].push({
      examId:     exam?.id || "",
      examName:   exam?.examName || "",
      topic:      grpMarks[0]?.topic || topicFromExam || "",
      date:       exam?.date || grpMarks[0]?.date || "",
      percentage: avg,
      obtained:   totalObt,
      maximum:    totalMax,
    });
  });

  SUBJECTS.forEach(sub => {
    result[sub].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );
    const seen = new Set<string>();
    result[sub] = result[sub].filter(p => {
      if (seen.has(p.examId)) return false;
      seen.add(p.examId);
      return true;
    });
    result[sub] = applyTopicRomans(result[sub]);
  });

  return result;
}

// ── Convert SubjectData to Recharts-compatible row format ─────────────────
export interface ChartRow {
  label:       string;
  date:        string;
  Physics:     number | null;
  Chemistry:   number | null;
  Mathematics: number | null;
  Biology:     number | null;
  _meta: Partial<Record<SubjectKey, ChartPoint>>;
}

export function buildRechartsRows(data: SubjectData): ChartRow[] {
  const rowMap = new Map<string, ChartRow>();

  SUBJECTS.forEach(sub => {
    data[sub].forEach(point => {
      const rowKey = point.examId || `${point.examName}_${point.date}`;
      if (!rowMap.has(rowKey)) {
        // Prefer numbered topic on axis when available (Electrostatics II)
        const source = (point.topic || point.examName || "").trim();
        const label =
          source.length > 16 ? source.slice(0, 16) + "…" : source;
        rowMap.set(rowKey, {
          label,
          date:        point.date,
          Physics:     null,
          Chemistry:   null,
          Mathematics: null,
          Biology:     null,
          _meta:       {},
        });
      }
      const row = rowMap.get(rowKey)!;
      row[sub] = point.percentage;
      row._meta[sub] = point;

      // If this subject has a better topic label and row still shows exam name, upgrade
      if (point.topic && (!row.label || row.label === point.examName || row.label.endsWith("…"))) {
        const source = point.topic.trim();
        row.label = source.length > 16 ? source.slice(0, 16) + "…" : source;
      }
    });
  });

  return Array.from(rowMap.values()).sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );
}