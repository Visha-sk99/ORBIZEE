import { db } from "@/firebase/config";
import {
  collection, addDoc, updateDoc, deleteDoc, doc,
  getDocs, getDoc, query, where, Timestamp,
} from "firebase/firestore";
import { Student } from "@/types";

const COL = "students";

export function invalidateStudentCache() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("studentCacheInvalidated"));
  }
}

export async function addStudent(data: Omit<Student, "id">) {
  const ref2 = await addDoc(collection(db, COL), { ...data, createdAt: Timestamp.now() });
  invalidateStudentCache();
  return ref2;
}

export async function updateStudent(id: string, data: Partial<Omit<Student, "id">>) {
  await updateDoc(doc(db, COL, id), data);
  invalidateStudentCache();
}

export async function deleteStudent(id: string) {
  await deleteDoc(doc(db, COL, id));
  invalidateStudentCache();
}

export async function getStudents(): Promise<Student[]> {
  const snap = await getDocs(collection(db, COL));
  const students = snap.docs.map(d => ({ id: d.id, ...d.data() } as Student));
  return students.sort((a, b) => {
    const ra = parseInt(a.rollNumber) || 0;
    const rb = parseInt(b.rollNumber) || 0;
    return ra - rb;
  });
}

export async function getStudent(id: string): Promise<Student | null> {
  const snap = await getDoc(doc(db, COL, id));
  return snap.exists() ? ({ id: snap.id, ...snap.data() } as Student) : null;
}

export async function getStudentsByDivision(division: string): Promise<Student[]> {
  const snap = await getDocs(
    query(collection(db, COL), where("division", "==", division))
  );
  const students = snap.docs.map(d => ({ id: d.id, ...d.data() } as Student));
  return students.sort((a, b) => (parseInt(a.rollNumber) || 0) - (parseInt(b.rollNumber) || 0));
}