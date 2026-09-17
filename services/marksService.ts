import { db } from "@/firebase/config";
import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  getDocs,
  query,
  where,
  writeBatch,
  Timestamp,
} from "firebase/firestore";
import { Mark } from "@/types";

const COL = "marks";

function getTimeMs(item: { createdAt?: any; date?: string }): number {
  const c = item.createdAt;
  if (c) {
    if (typeof c.toMillis === "function") return c.toMillis();
    if (typeof c.seconds === "number") return c.seconds * 1000;
  }
  return new Date(item.date || 0).getTime();
}

export async function addMark(data: Omit<Mark, "id">) {
  return addDoc(collection(db, COL), {
    ...data,
    createdAt: Timestamp.now(),
  });
}

export async function updateMark(id: string, data: Partial<Mark>) {
  return updateDoc(doc(db, COL, id), data);
}

export async function deleteMark(id: string) {
  return deleteDoc(doc(db, COL, id));
}

export async function getAllMarks(): Promise<Mark[]> {
  const snap = await getDocs(collection(db, COL));
  return snap.docs
    .map((d) => ({ id: d.id, ...d.data() } as Mark))
    .sort((a, b) => getTimeMs(b) - getTimeMs(a)); // latest entered first
}

export async function getMarksByStudent(studentId: string): Promise<Mark[]> {
  const snap = await getDocs(
    query(collection(db, COL), where("studentId", "==", studentId))
  );
  return snap.docs
    .map((d) => ({ id: d.id, ...d.data() } as Mark))
    .sort((a, b) => getTimeMs(b) - getTimeMs(a));
}

export async function getMarksByExam(examId: string): Promise<Mark[]> {
  const snap = await getDocs(
    query(collection(db, COL), where("examId", "==", examId))
  );
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Mark));
}

export async function getMarksByDivision(division: string): Promise<Mark[]> {
  const snap = await getDocs(
    query(collection(db, COL), where("division", "==", division))
  );
  return snap.docs
    .map((d) => ({ id: d.id, ...d.data() } as Mark))
    .sort((a, b) => getTimeMs(b) - getTimeMs(a));
}

/** Batch save for the marks entry page */
export async function saveExamMarks(
  marks: Array<Omit<Mark, "id"> & { id?: string }>
) {
  const batch = writeBatch(db);

  marks.forEach((m) => {
    const ref = m.id
      ? doc(db, COL, m.id)
      : doc(collection(db, COL)); // auto-id

    const { id, ...data } = m;
    batch.set(ref, {
      ...data,
      createdAt: (data as any).createdAt ?? Timestamp.now(),
    }, { merge: true });
  });

  await batch.commit();
}