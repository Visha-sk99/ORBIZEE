import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import type { Student } from "@/types";
import { normalizeSubject, SUBJECT_COLORS } from "@/lib/chartUtils";

interface ExamGroup {
  name: string;
  date: string;
  marks: any[];
}

interface OverallGrowth {
  value: number;
  firstPct: number;
  lastPct: number;
  from: string;
  to: string;
  totalExams: number;
}

type RGB = [number, number, number];

const COLORS: Record<string, RGB> = {
  maroon: [111, 29, 27],
  brown: [153, 88, 42],
  tan: [187, 148, 87],
  darkBrown: [67, 40, 24],
  cream: [255, 230, 167],
  creamTint: [255, 247, 227],
  white: [255, 255, 255],
  textDark: [40, 28, 20],
  textMuted: [130, 108, 90],
  green: [16, 185, 129],
  amber: [245, 158, 11],
  red: [239, 68, 68],
  blue: [37, 99, 235],
};

function hexToRgb(hex: string): RGB {
  const clean = hex.replace("#", "");
  const bigint = parseInt(clean, 16);
  return [(bigint >> 16) & 255, (bigint >> 8) & 255, bigint & 255];
}

function pctColor(pct: number): RGB {
  if (pct >= 80) return COLORS.green;
  if (pct >= 60) return COLORS.amber;
  return COLORS.red;
}

function growthColor(v: number): RGB {
  if (v > 0) return COLORS.green;
  if (v < 0) return COLORS.red;
  return COLORS.textMuted;
}

function getGrade(pct: number): string {
  if (pct >= 90) return "A+";
  if (pct >= 80) return "A";
  if (pct >= 70) return "B+";
  if (pct >= 60) return "B";
  if (pct >= 50) return "C";
  if (pct >= 33) return "D";
  return "F";
}

const ROMANS = [
  "I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X",
  "XI", "XII", "XIII", "XIV", "XV", "XVI", "XVII", "XVIII", "XIX", "XX",
];

function baseTopic(topic: string): string {
  return topic
    .trim()
    .replace(/\s+(I{1,3}|IV|VI{0,3}|IX|X{1,3}|XI{0,3}|XIV|XV|XVI{0,3}|XIX|XX)$/i, "")
    .trim();
}

/**
 * Roman labels must be applied in chronological order (oldest → newest)
 * so the first exam is I and later ones are II, III…
 */
function applyTopicRomanLabels(examGroups: ExamGroup[]): ExamGroup[] {
  const chronological = [...examGroups].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  const counts = new Map<string, number>();
  chronological.forEach(grp => {
    grp.marks.forEach((m: any) => {
      const raw = (m.topic || "").trim();
      if (!raw) return;
      const key = `${m.subject || ""}||${baseTopic(raw).toLowerCase()}`;
      counts.set(key, (counts.get(key) || 0) + 1);
    });
  });

  const needsNumber = new Set(
    [...counts.entries()].filter(([, n]) => n > 1).map(([k]) => k)
  );

  const seen = new Map<string, number>();

  return chronological.map(grp => ({
    ...grp,
    marks: grp.marks.map((m: any) => {
      const raw = (m.topic || "").trim();
      if (!raw) return m;
      const base = baseTopic(raw);
      const key = `${m.subject || ""}||${base.toLowerCase()}`;
      if (!needsNumber.has(key)) {
        return { ...m, topic: base };
      }
      const n = (seen.get(key) || 0) + 1;
      seen.set(key, n);
      const roman = ROMANS[n - 1] || String(n);
      return { ...m, topic: `${base} ${roman}` };
    }),
  }));
}

export function exportStudentReportPDF(
  student: Student,
  examGroups: ExamGroup[],
  overallPct: number,
  last3GrowthPct: number | null,
  overallGrowth: OverallGrowth | null = null
) {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const marginX = 14;
  const contentW = pageW - marginX * 2;

  // Labels in chronological order, then reverse for table (latest first)
  const labeledGroups = applyTopicRomanLabels(examGroups);
  const orderedGroups = [...labeledGroups].reverse();

  // ── Header band ──────────────────────────────────────────────────────
  doc.setFillColor(...COLORS.tan);
  doc.rect(0, 0, pageW, 2.5, "F");
  doc.setFillColor(...COLORS.darkBrown);
  doc.rect(0, 2.5, pageW, 43.5, "F");

  doc.setFillColor(...COLORS.tan);
  doc.roundedRect(marginX, 10, 26, 26, 4, 4, "F");
  doc.setTextColor(...COLORS.darkBrown);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text("ORBIZEE", marginX + 13, 21, { align: "center" });
  doc.setFontSize(7);
  doc.text("INSTITUTE", marginX + 13, 27, { align: "center" });

  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.setTextColor(...COLORS.white);
  doc.text("Student Performance Report", marginX + 34, 20);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...COLORS.cream);
  doc.text("ORBIZEE INSTITUTE", marginX + 34, 27);

  doc.setFontSize(8);
  doc.setTextColor(210, 190, 165);
  doc.text(
    `Generated: ${new Date().toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    })}`,
    marginX + 34,
    33
  );

  const badgeW = 26;
  const badgeH = 26;
  const badgeX = pageW - marginX - badgeW;
  const badgeY = 10;
  doc.setFillColor(...pctColor(overallPct));
  doc.roundedRect(badgeX, badgeY, badgeW, badgeH, 4, 4, "F");
  doc.setDrawColor(...COLORS.tan);
  doc.setLineWidth(0.4);
  doc.roundedRect(badgeX, badgeY, badgeW, badgeH, 4, 4, "S");
  doc.setTextColor(...COLORS.white);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(15);
  doc.text(`${overallPct}%`, badgeX + badgeW / 2, badgeY + 15, { align: "center" });
  doc.setFontSize(6.5);
  doc.text("OVERALL", badgeX + badgeW / 2, badgeY + 21, { align: "center" });

  let y = 54;

  // ── Student profile card ────────────────────────────────────────────
  const studentCardH = 26;
  doc.setFillColor(...COLORS.creamTint);
  doc.roundedRect(marginX, y, contentW, studentCardH, 3, 3, "F");
  doc.setDrawColor(...COLORS.tan);
  doc.setLineWidth(0.3);
  doc.roundedRect(marginX, y, contentW, studentCardH, 3, 3, "S");
  doc.setFillColor(...COLORS.brown);
  doc.rect(marginX, y, 2, studentCardH, "F");

  doc.setTextColor(...COLORS.textDark);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text(student.fullName, marginX + 8, y + 10);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(...COLORS.textMuted);
  doc.text(
    `Roll No: ${student.rollNumber}   \u00b7   Class ${student.class} ${student.division}${
      student.stream ? `   \u00b7   ${student.stream}` : ""
    }`,
    marginX + 8,
    y + 17
  );
  doc.text(`Parent / Guardian: ${student.parentName || "\u2014"}`, marginX + 8, y + 23);

  y += studentCardH + 8;

  // ── Quick stats ─────────────────────────────────────────────────────
  interface StatCard {
    label: string;
    value: string;
    color: RGB;
  }

  const stats: StatCard[] = [
    { label: "OVERALL %", value: `${overallPct}%`, color: pctColor(overallPct) },
    { label: "TOTAL EXAMS", value: `${labeledGroups.length}`, color: COLORS.brown },
  ];
  if (overallGrowth) {
    stats.push({
      label: "OVERALL GROWTH",
      value: `${overallGrowth.value > 0 ? "+" : ""}${overallGrowth.value}%`,
      color: growthColor(overallGrowth.value),
    });
  }
  if (last3GrowthPct !== null) {
    stats.push({
      label: "LAST 3 EXAMS",
      value: `${last3GrowthPct > 0 ? "+" : ""}${last3GrowthPct}%`,
      color: growthColor(last3GrowthPct),
    });
  }

  const statGap = 4;
  const statH = 22;
  const statW = (contentW - statGap * (stats.length - 1)) / stats.length;

  stats.forEach((s, i) => {
    const sx = marginX + i * (statW + statGap);
    doc.setFillColor(...COLORS.creamTint);
    doc.roundedRect(sx, y, statW, statH, 3, 3, "F");
    doc.setDrawColor(230, 210, 180);
    doc.setLineWidth(0.25);
    doc.roundedRect(sx, y, statW, statH, 3, 3, "S");

    doc.setTextColor(...s.color);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.text(s.value, sx + statW / 2, y + 12, { align: "center" });

    doc.setFont("helvetica", "normal");
    doc.setFontSize(6.5);
    doc.setTextColor(...COLORS.textMuted);
    doc.text(s.label, sx + statW / 2, y + 18, { align: "center" });
  });

  y += statH + 6;

  if (overallGrowth) {
    doc.setFont("helvetica", "italic");
    doc.setFontSize(8);
    doc.setTextColor(...COLORS.textMuted);
    doc.text(
      `Journey: ${overallGrowth.from} (${overallGrowth.firstPct}%)  \u2192  ${overallGrowth.to} (${overallGrowth.lastPct}%)  across ${overallGrowth.totalExams} exams`,
      marginX,
      y
    );
    y += 8;
  }

  // ── Subject-wise summary ────────────────────────────────────────────
  interface SubjectSummary {
    subject: string;
    pct: number;
  }

  const subjectMap = new Map<string, { obtained: number; max: number }>();

  labeledGroups.forEach(grp => {
    grp.marks.forEach((m: any) => {
      const totalMarks = m.totalMarks || m.maximumMarks || 100;
      const marksObtained = m.marksObtained ?? m.obtainedMarks;
      const isPresent =
        m.status === "present" ||
        (m.status == null && marksObtained != null && marksObtained !== "");
      if (!isPresent) return;
      const subj = normalizeSubject(m.subject) || m.subject || "Other";
      const entry = subjectMap.get(subj) || { obtained: 0, max: 0 };
      entry.obtained += Number(marksObtained) || 0;
      entry.max += totalMarks;
      subjectMap.set(subj, entry);
    });
  });

  const subjectSummaries: SubjectSummary[] = Array.from(subjectMap.entries())
    .map(([subject, v]) => ({
      subject,
      pct: v.max > 0 ? Math.round((v.obtained / v.max) * 1000) / 10 : 0,
    }))
    .sort((a, b) => b.pct - a.pct);

  if (subjectSummaries.length > 0) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10.5);
    doc.setTextColor(...COLORS.textDark);
    doc.text("Subject-wise Performance", marginX, y);
    y += 6;

    const perRow = Math.min(subjectSummaries.length, 4);
    const badgeGap = 4;
    const badgeW2 = (contentW - badgeGap * (perRow - 1)) / perRow;
    const badgeH2 = 18;

    subjectSummaries.forEach((s, i) => {
      const row = Math.floor(i / perRow);
      const col = i % perRow;
      const bx = marginX + col * (badgeW2 + badgeGap);
      const by = y + row * (badgeH2 + badgeGap);
      const subjColor = hexToRgb(SUBJECT_COLORS[s.subject] || "#6b7280");

      doc.setFillColor(...COLORS.white);
      doc.roundedRect(bx, by, badgeW2, badgeH2, 3, 3, "F");
      doc.setDrawColor(...subjColor);
      doc.setLineWidth(0.5);
      doc.roundedRect(bx, by, badgeW2, badgeH2, 3, 3, "S");

      doc.setFont("helvetica", "bold");
      doc.setFontSize(8.5);
      doc.setTextColor(...subjColor);
      doc.text(s.subject, bx + 5, by + 7);

      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.setTextColor(...COLORS.textDark);
      doc.text(`${s.pct}%`, bx + badgeW2 - 5, by + 12, { align: "right" });
    });

    const rows = Math.ceil(subjectSummaries.length / perRow);
    y += rows * (badgeH2 + badgeGap) + 4;
  }

  // ── Detailed table (LATEST → OLDEST) ────────────────────────────────
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10.5);
  doc.setTextColor(...COLORS.textDark);
  doc.text("Detailed Exam Results", marginX, y);
  y += 6;

  const tableRows: any[] = [];

  orderedGroups.forEach(grp => {
    let tot = 0;
    let obt = 0;

    grp.marks.forEach((m: any) => {
      const totalMarks = m.totalMarks || m.maximumMarks || 100;
      const marksObtained = m.marksObtained ?? m.obtainedMarks ?? 0;
      const isPresent =
        m.status === "present" ||
        (m.status == null && marksObtained != null && marksObtained !== "");
      if (isPresent) {
        tot += totalMarks;
        obt += Number(marksObtained) || 0;
      }
    });

    const examPct = tot > 0 ? Math.round((obt / tot) * 1000) / 10 : 0;
    const rowSpan = grp.marks.length;

    grp.marks.forEach((m: any, mi: number) => {
      const totalMarks = m.totalMarks || m.maximumMarks || 100;
      const marksObtained = m.marksObtained ?? m.obtainedMarks;
      const isPresent =
        m.status === "present" ||
        (m.status == null && marksObtained != null && marksObtained !== "");
      const mPct =
        isPresent && totalMarks > 0
          ? Math.round((Number(marksObtained) / totalMarks) * 1000) / 10
          : 0;

      const row: any[] = [];

      row.push(m.subject || "\u2014");

      if (mi === 0) {
        row.push(
          rowSpan > 1
            ? {
                content: `${grp.name}\n${grp.date}`,
                rowSpan,
                styles: { valign: "middle", fontStyle: "bold", fontSize: 8 },
              }
            : `${grp.name}\n${grp.date}`
        );
      }

      row.push(m.topic || "\u2014");
      row.push(isPresent ? `${marksObtained}/${totalMarks}` : m.status || "AB");
      row.push(isPresent ? mPct : "\u2014");
      row.push(isPresent ? getGrade(mPct) : "\u2014");

      if (mi === 0) {
        row.push(
          rowSpan > 1
            ? {
                content: tot > 0 ? `${obt}/${tot}` : "\u2014",
                rowSpan,
                styles: { valign: "middle" },
              }
            : tot > 0
            ? `${obt}/${tot}`
            : "\u2014"
        );
        row.push(
          rowSpan > 1
            ? {
                content: tot > 0 ? `${examPct}%` : "\u2014",
                rowSpan,
                styles: { valign: "middle", fontStyle: "bold" },
              }
            : tot > 0
            ? `${examPct}%`
            : "\u2014"
        );
      }

      tableRows.push(row);
    });
  });

  autoTable(doc, {
    startY: y,
    head: [["Subject", "Exam", "Topic", "Marks", "%", "Grade", "Total", "Overall"]],
    body: tableRows,
    theme: "grid",
    styles: {
      font: "helvetica",
      fontSize: 9,
      cellPadding: { top: 3.5, right: 2.5, bottom: 3.5, left: 2.5 },
      lineColor: [225, 200, 170],
      lineWidth: 0.25,
      textColor: COLORS.textDark,
      valign: "middle",
    },
    headStyles: {
      fillColor: COLORS.darkBrown,
      textColor: COLORS.white,
      fontSize: 9,
      fontStyle: "bold",
      halign: "center",
      cellPadding: { top: 4, right: 2, bottom: 4, left: 2 },
    },
    bodyStyles: {
      fontSize: 9,
    },
    alternateRowStyles: {
      fillColor: COLORS.creamTint,
    },
    columnStyles: {
      0: { cellWidth: 26, fontStyle: "bold", halign: "left" },
      1: { cellWidth: 34, fontStyle: "bold", fontSize: 8 },
      2: { cellWidth: 32, fontSize: 8 },
      3: { cellWidth: 22, halign: "center", fontStyle: "bold" },
      4: { cellWidth: 16, halign: "center", fontStyle: "bold" },
      5: { cellWidth: 16, halign: "center", fontStyle: "bold" },
      6: { cellWidth: 20, halign: "center" },
      7: { cellWidth: 18, halign: "center", fontStyle: "bold" },
    },
    margin: { left: marginX, right: marginX },
    didParseCell: data => {
      if (data.section === "body" && data.column.index === 5) {
        const g = String(data.cell.raw);
        if (g === "A+" || g === "A") data.cell.styles.textColor = COLORS.green;
        else if (g === "B+" || g === "B") data.cell.styles.textColor = COLORS.blue;
        else if (g === "C" || g === "D") data.cell.styles.textColor = COLORS.amber;
        else if (g === "F") data.cell.styles.textColor = COLORS.red;
      }
      if (data.section === "body" && data.column.index === 7) {
        const raw = String(data.cell.raw).replace("%", "");
        const n = parseFloat(raw);
        if (!isNaN(n)) {
          if (n >= 80) data.cell.styles.textColor = COLORS.green;
          else if (n >= 60) data.cell.styles.textColor = COLORS.amber;
          else if (n > 0) data.cell.styles.textColor = COLORS.red;
        }
      }
    },
  });

  // ── Footer ──────────────────────────────────────────────────────────
  const totalPages = (doc.internal as any).getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setDrawColor(...COLORS.tan);
    doc.setLineWidth(0.3);
    doc.line(marginX, pageH - 12, pageW - marginX, pageH - 12);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(...COLORS.textMuted);
    doc.text(
      `ORBIZEE INSTITUTE  \u00b7  ${student.fullName}  \u00b7  Roll #${student.rollNumber}  \u00b7  Page ${i} of ${totalPages}`,
      pageW / 2,
      pageH - 6,
      { align: "center" }
    );
  }

  const filename = `Report_${student.fullName.replace(/\s+/g, "_")}_${student.rollNumber}.pdf`;
  doc.save(filename);
}