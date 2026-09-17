import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import type { Exam } from "@/types";

type MarkStatus = "AB" | "ML" | "NA";
type CellValue = number | MarkStatus;
type MarkCellValue = CellValue; // alias so both names work

function isStatus(v: CellValue): v is MarkStatus {
  return v === "AB" || v === "ML" || v === "NA";
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

interface SimpleStudent {
  id: string;
  fullName: string;
  rollNumber: string;
}

export function exportMarksPDF(
  exam: Exam,
  students: SimpleStudent[],
  tableData: CellValue[][]
) {
  const doc = new jsPDF({
    orientation: "landscape",
    unit: "mm",
    format: "a4",
  });

  const pageW = doc.internal.pageSize.getWidth();

  // ── Dark header bar ───────────────────────────────────────────────────
  doc.setFillColor(15, 23, 42);
  doc.rect(0, 0, pageW, 30, "F");

  // Institute name
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.text("ORBIZEE", 14, 12);

  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(148, 163, 184);
  doc.text("Coaching Institute Management System", 14, 18);

  // Exam info — right side
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(255, 255, 255);
  doc.text(exam.examName, pageW - 14, 10, { align: "right" });

  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(148, 163, 184);
  doc.text(
    `Division: ${exam.division}  ·  Date: ${exam.date}  ·  ${exam.day}  ·  Class: ${exam.class}`,
    pageW - 14, 17, { align: "right" }
  );
  doc.text(
    `Total Students: ${students.length}`,
    pageW - 14, 23, { align: "right" }
  );

  // ── Subject info line ────────────────────────────────────────────────
  let y = 36;
  doc.setFontSize(7.5);
  doc.setTextColor(71, 85, 105);
  doc.setFont("helvetica", "normal");

  const subjectLine = exam.subjects.map(s =>
    `${s.subject}${s.topic ? ` (${s.topic})` : ""}  ·  ${s.paperType}  ·  Max: ${s.maximumMarks}`
  ).join("     |     ");
  doc.text(subjectLine, 14, y);

  // ── Build table data ──────────────────────────────────────────────────
  y += 4;

  const columns = [
    { header: "Roll",          dataKey: "roll" },
    { header: "Student Name",  dataKey: "name" },
    ...exam.subjects.map((s, i) => ({
      header: `${s.subject}\n${s.topic ? s.topic + "\n" : ""}${s.paperType} · /${s.maximumMarks}`,
      dataKey: `sub_${i}`,
    })),
    { header: "Total",  dataKey: "total" },
    { header: "%",      dataKey: "pct"   },
    { header: "Grade",  dataKey: "grade" },
  ];

  const rows = students.map((student, ri) => {
    const row: Record<string, string> = {
      roll: student.rollNumber,
      name: student.fullName,
    };

    let obtained = 0;
    let total    = 0;
    let hasData  = false;

    exam.subjects.forEach((sub, ci) => {
      const val = tableData[ri]?.[ci] ?? "AB";
      if (!isStatus(val)) {
        const n = val as number;
        row[`sub_${ci}`] = `${n} / ${sub.maximumMarks}`;
        obtained += n;
        total    += sub.maximumMarks;
        hasData   = true;
      } else {
        row[`sub_${ci}`] = String(val);
      }
    });

    const pct = hasData && total > 0
      ? Math.round((obtained / total) * 1000) / 10
      : 0;

    row.total = hasData ? `${obtained} / ${total}` : "—";
    row.pct   = hasData ? `${pct}%`                : "—";
    row.grade = hasData ? getGrade(pct)             : "—";

    return row;
  });

  // ── Render table ──────────────────────────────────────────────────────
  autoTable(doc, {
    startY: y,
    columns,
    body: rows,
    theme: "grid",
    headStyles: {
      fillColor:   [30, 41, 59],
      textColor:   [255, 255, 255],
      fontStyle:   "bold",
      fontSize:    7.5,
      halign:      "center",
      cellPadding: 3,
      lineColor:   [51, 65, 85],
      lineWidth:   0.3,
    },
    bodyStyles: {
      fontSize:    8,
      cellPadding: 2.5,
      textColor:   [15, 23, 42],
      lineColor:   [226, 232, 240],
      lineWidth:   0.2,
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
    columnStyles: {
      roll:  { halign: "center", cellWidth: 14,  fontStyle: "bold" },
      name:  { cellWidth: 45 },
      total: { halign: "center", cellWidth: 24,  fontStyle: "bold" },
      pct:   { halign: "center", cellWidth: 16,  fontStyle: "bold" },
      grade: { halign: "center", cellWidth: 14,  fontStyle: "bold" },
      ...Object.fromEntries(
        exam.subjects.map((_, i) => [
          `sub_${i}`,
          { halign: "center" as const },
        ])
      ),
    },
    didParseCell(data) {
      const raw = String(data.cell.raw ?? "");

      // Colour percentage column
      if (data.column.dataKey === "pct") {
        const n = parseFloat(raw);
        if (!isNaN(n)) {
          if (n >= 80)      data.cell.styles.textColor = [5,  150, 105];
          else if (n >= 60) data.cell.styles.textColor = [217, 119, 6];
          else if (n > 0)   data.cell.styles.textColor = [220, 38,  38];
        }
      }

      // Colour grade column
      if (data.column.dataKey === "grade") {
        if (raw === "A+" || raw === "A")  data.cell.styles.textColor = [5,  150, 105];
        if (raw === "B+" || raw === "B")  data.cell.styles.textColor = [37, 99,  235];
        if (raw === "C"  || raw === "D")  data.cell.styles.textColor = [217, 119, 6];
        if (raw === "F")                  data.cell.styles.textColor = [220, 38,  38];
      }

      // Colour status cells
      if (raw === "AB") data.cell.styles.textColor = [220, 38,  38];
      if (raw === "ML") data.cell.styles.textColor = [217, 119, 6];
      if (raw === "NA") data.cell.styles.textColor = [100, 116, 139];
    },
  });

  // ── Summary line ──────────────────────────────────────────────────────
  const tableEndY = (doc as jsPDF & { lastAutoTable: { finalY: number } })
    .lastAutoTable.finalY + 6;

  const presentRows = rows.filter(r => r.pct !== "—");
  const pcts        = presentRows.map(r => parseFloat(r.pct));
  const avg         = pcts.length
    ? Math.round(pcts.reduce((s, v) => s + v, 0) / pcts.length * 10) / 10
    : 0;
  const highest = pcts.length ? Math.max(...pcts) : 0;
  const lowest  = pcts.length ? Math.min(...pcts) : 0;
  const passed  = pcts.filter(p => p >= 33).length;
  const absent  = rows.length - presentRows.length;

  const pageH = doc.internal.pageSize.getHeight();
  if (tableEndY < pageH - 16) {
    doc.setFontSize(7.5);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(30, 41, 59);
    doc.text(
      `Class Summary  —  Average: ${avg}%   Highest: ${highest}%   Lowest: ${lowest}%   Passed (≥33%): ${passed} / ${presentRows.length}   Absent: ${absent}`,
      14, tableEndY
    );
  }

  // ── Footer on every page ──────────────────────────────────────────────
  const totalPages = (doc.internal as unknown as { getNumberOfPages: () => number })
    .getNumberOfPages();

  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(7);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(148, 163, 184);
    doc.text(
      `ORBIZEE   ·  ${exam.examName}  ·  Division ${exam.division}  ·  Generated ${new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}  ·  Page ${i} of ${totalPages}`,
      pageW / 2,
      pageH - 5,
      { align: "center" }
    );
  }

  // ── Download ──────────────────────────────────────────────────────────
  const filename = `${exam.examName.replace(/\s+/g, "_")}_${exam.division}_${exam.date}.pdf`;
  doc.save(filename);
}