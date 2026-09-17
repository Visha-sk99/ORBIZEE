"use client";
import { useEffect, useState } from "react";
import { Mark } from "@/types";
import { getAllMarks, getMarksByStudent, getMarksByExam } from "@/services/marksService";

let cachedAllMarks: Mark[] = [];
let allMarksCacheTime = 0;
const CACHE_TTL = 60_000;

export function useAllMarks() {
  const [marks, setMarks] = useState<Mark[]>(cachedAllMarks);
  const [loading, setLoading] = useState(cachedAllMarks.length === 0);
  const [error, setError] = useState<string | null>(null);

  const refresh = async (force = false) => {
    const now = Date.now();
    if (!force && cachedAllMarks.length > 0 && now - allMarksCacheTime < CACHE_TTL) {
      setMarks(cachedAllMarks);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await getAllMarks();
      cachedAllMarks = data;
      allMarksCacheTime = Date.now();
      setMarks(data);
    } catch (e) {
      console.error("useAllMarks:", e);
      setError("Failed to load marks");
      setMarks(cachedAllMarks);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
  }, []);

  return { marks, loading, error, refresh: () => refresh(true) };
}

const studentMarksCache = new Map<string, { data: Mark[]; time: number }>();

export function useStudentMarks(studentId: string) {
  const cached = studentMarksCache.get(studentId);
  const [marks, setMarks] = useState<Mark[]>(cached?.data || []);
  const [loading, setLoading] = useState(!cached);

  useEffect(() => {
    if (!studentId) return;

    const hit = studentMarksCache.get(studentId);
    if (hit && Date.now() - hit.time < CACHE_TTL) {
      setMarks(hit.data);
      setLoading(false);
      return;
    }

    setLoading(true);
    getMarksByStudent(studentId)
      .then((data) => {
        studentMarksCache.set(studentId, { data, time: Date.now() });
        setMarks(data);
      })
      .catch((e) => {
        console.error("useStudentMarks:", e);
      })
      .finally(() => setLoading(false));
  }, [studentId]);

  return { marks, loading };
}

export function useExamMarks(examId: string) {
  const [marks, setMarks] = useState<Mark[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!examId) return;
    setLoading(true);
    getMarksByExam(examId)
      .then((data) => setMarks(data))
      .catch((e) => console.error("useExamMarks:", e))
      .finally(() => setLoading(false));
  }, [examId]);

  return { marks, loading };
}