import { db } from "@/firebase/config";
import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  getDocs,
  getDoc,
  Timestamp,
} from "firebase/firestore";
import { Exam } from "@/types";

const COL = "exams";

function getTimeMs(item: { createdAt?: any; date?: string }): number {
  const c = item.createdAt;
  if (c) {
    if (typeof c.toMillis === "function") return c.toMillis();
    if (typeof c.seconds === "number") return c.seconds * 1000;
  }
  return new Date(item.date || 0).getTime();
}

export async function addExam(data: Omit<Exam, "id">) {
  return addDoc(collection(db, COL), {
    ...data,
    createdAt: Timestamp.now(),
  });
}

export async function updateExam(id: string, data: Partial<Exam>) {
  return updateDoc(doc(db, COL, id), data);
}

export async function deleteExam(id: string) {
  return deleteDoc(doc(db, COL, id));
}

export async function getExams(): Promise<Exam[]> {
  const snap = await getDocs(collection(db, COL));
  return snap.docs
    .map((d) => ({ id: d.id, ...d.data() } as Exam))
    .sort((a, b) => getTimeMs(b) - getTimeMs(a)); // latest entered first
}

export async function getExam(id: string): Promise<Exam | null> {
  const snap = await getDoc(doc(db, COL, id));
  return snap.exists() ? ({ id: snap.id, ...snap.data() } as Exam) : null;
}