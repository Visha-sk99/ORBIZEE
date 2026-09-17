import type { Student, Exam, Mark, Stream } from "@/types";
import { normalizeSubject, SUBJECTS, SubjectKey } from "@/lib/chartUtils";
import { STREAMS } from "@/lib/utils";

export interface BatchOverview {
  division: string;
  standard: string;
  studentCount: number;
  totalExams: number;
  subjectExams: Record<SubjectKey, number>;
  latestExam: { name: string; date: string } | null;
}

export interface StreamOverview {
  stream: Stream;
  studentCount: number;
  totalExams: number;
  subjectExams: Record<SubjectKey, number>;
  latestExam: { name: string; date: string } | null;
}

export interface SubjectGrowth {
  subject: SubjectKey;
  latest: number | null;
  previous: number | null;
  growth: number | null;
  examCount: number;
}

export function buildBatchOverview(
  division: string,
  students: Student[],
  exams: Exam[]
): BatchOverview {
  const divStudents = students.filter(s => s.division === division);
  const divExams = exams.filter(e => e.division === division);

  const subjectExams: Record<SubjectKey, number> = {
    Physics: 0, Chemistry: 0, Mathematics: 0, Biology: 0,
  };

  divExams.forEach(exam => {
    (exam.subjects || []).forEach(s => {
      const sub = normalizeSubject(s.subject);
      if (sub) subjectExams[sub]++;
    });
  });

  const sorted = [...divExams].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  return {
    division,
    standard: division.replace(/[A-Za-z]+$/, ""),
    studentCount: divStudents.length,
    totalExams: divExams.length,
    subjectExams,
    latestExam: sorted[0]
      ? { name: sorted[0].examName, date: sorted[0].date }
      : null,
  };
}

export function buildStreamOverviews(
  division: string,
  students: Student[],
  exams: Exam[]
): StreamOverview[] {
  return STREAMS.map(stream => {
    const streamStudents = students.filter(
      s => s.division === division && s.stream === stream
    );
    const streamExams = exams.filter(
      e => e.division === division && e.stream === stream
    );

    const subjectExams: Record<SubjectKey, number> = {
      Physics: 0, Chemistry: 0, Mathematics: 0, Biology: 0,
    };

    streamExams.forEach(exam => {
      (exam.subjects || []).forEach(s => {
        const sub = normalizeSubject(s.subject);
        if (sub) subjectExams[sub]++;
      });
    });

    const sorted = [...streamExams].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );

    return {
      stream,
      studentCount: streamStudents.length,
      totalExams: streamExams.length,
      subjectExams,
      latestExam: sorted[0]
        ? { name: sorted[0].examName, date: sorted[0].date }
        : null,
    };
  });
}

export function buildSubjectGrowth(
  division: string,
  exams: Exam[],
  marks: Mark[],
  stream?: Stream
): SubjectGrowth[] {
  let divExams = exams
    .filter(e => e.division === division)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  if (stream) {
    divExams = divExams.filter(e => e.stream === stream);
  }

  return SUBJECTS.map(sub => {
    const subExams = divExams.filter(e =>
      (e.subjects || []).some(s => normalizeSubject(s.subject) === sub)
    );

    if (subExams.length === 0) {
      return { subject: sub, latest: null, previous: null, growth: null, examCount: 0 };
    }

    const getAvg = (exam: Exam): number | null => {
      const examMarks = marks.filter(m => {
        if (m.examId !== exam.id) return false;
        if (normalizeSubject(m.subject) !== sub) return false;
        if (m.status !== "present") return false;
        if (m.obtainedMarks === null || m.maximumMarks <= 0) return false;
        if (stream && m.stream && m.stream !== stream) return false;
        return true;
      });
      if (!examMarks.length) return null;
      const tot = examMarks.reduce((s, m) => s + m.maximumMarks, 0);
      const obt = examMarks.reduce((s, m) => s + (m.obtainedMarks ?? 0), 0);
      return Math.round((obt / tot) * 1000) / 10;
    };

    const latest = getAvg(subExams[subExams.length - 1]);
    const previous = subExams.length >= 2 ? getAvg(subExams[subExams.length - 2]) : null;
    const growth =
      latest !== null && previous !== null
        ? Math.round((latest - previous) * 10) / 10
        : null;

    return { subject: sub, latest, previous, growth, examCount: subExams.length };
  });
}

export function recentExamsForBatch(
  division: string,
  exams: Exam[],
  limit = 5,
  stream?: Stream
) {
  return exams
    .filter(e => e.division === division && (!stream || e.stream === stream))
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, limit);
}