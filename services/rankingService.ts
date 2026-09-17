import { Student, Mark, Ranking } from "@/types";
import { calcPercentage } from "@/lib/utils";

export function computeRankings(students: Student[], marks: Mark[]): Ranking[] {
  const map = new Map<string, { obtained: number; total: number; student: Student }>();

  // Initialize all students
  students.forEach(s => {
    map.set(s.id, { obtained: 0, total: 0, student: s });
  });

  // Aggregate marks
  marks.forEach(m => {
    const entry = map.get(m.studentId);
    if (!entry || m.status === "AB" || m.status === "ML" || m.status === "NA") return;
    
    if (m.obtainedMarks !== null && m.obtainedMarks !== undefined) {
      entry.obtained += m.obtainedMarks;
      entry.total += m.maximumMarks;
    }
  });

  // Create rankings
  const rankings: Ranking[] = Array.from(map.values())
    .filter(e => e.total > 0)
    .map(e => ({
      studentId: e.student.id,
      fullName: e.student.fullName,
      profilePhoto: e.student.profilePhoto,
      class: e.student.class,
      division: e.student.division,
      percentage: calcPercentage(e.obtained, e.total),
      rank: 0,
    }))
    .sort((a, b) => b.percentage - a.percentage);

  // Assign ranks
  rankings.forEach((r, i) => {
    r.rank = i + 1;
  });

  return rankings;
}