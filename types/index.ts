export type Stream = "JEE Main" | "NEET" | "Boards";
export type Subject = "Physics" | "Chemistry" | "Mathematics" | "Biology";
export type MarkStatus = "present" | "AB" | "ML" | "NA";

export interface Student {
  id: string;
  fullName: string;
  rollNumber: string;
  profilePhoto?: string;
  class: string;
  division: string;
  stream?: Stream | "";   // allow empty string while form is filling
  parentName?: string;
  parentContact?: string;
  email?: string;
  admissionDate?: string;
}

export interface ExamSubject {
  subject: string;
  topic: string;
  paperType?: string;
  maximumMarks: number;
}

export interface Exam {
  id: string;
  examName: string;
  class: string;
  division: string;
  stream?: Stream;
  date: string;
  day?: string;
  subjects: ExamSubject[];
}

export interface Mark {
  id: string;
  examId: string;
  studentId: string;
  studentName?: string;
  class: string;
  division: string;
  stream?: Stream;
  subject: string;
  topic?: string;
  paperType?: string;
  obtainedMarks: number | null;
  maximumMarks: number;
  status: "present" | "AB" | "ML" | "NA";
  percentage?: number;
  date?: string;
}

export interface Ranking {
  studentId: string;
  fullName: string;
  profilePhoto?: string;
  class: string;
  division: string;
  stream?: Stream;
  percentage: number;
  rank: number;
}

export interface SubjectPerformance {
  subject: Subject;
  average: number;
  examsCount: number;
}
export type PaperType = "Theory" | "Entrance" | "Practical" | "MCQ" | "Unit Test" | "Assignment";

export interface SubjectConfig {
  subject: Subject;
  topic: string;
  paperType: PaperType;
  maximumMarks: number;
}

