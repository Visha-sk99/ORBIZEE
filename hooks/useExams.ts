"use client";
import { useEffect, useState } from "react";
import { Exam } from "@/types";
import { getExams } from "@/services/examService";

let cachedExams: Exam[] = [];
let cacheTime = 0;
const CACHE_TTL = 60_000;

export function useExams() {
  const [exams, setExams]   = useState<Exam[]>(cachedExams);
  const [loading, setLoading] = useState(cachedExams.length === 0);
  const [error, setError]   = useState<string | null>(null);

  const refresh = async (force = false) => {
    const now = Date.now();
    if (!force && cachedExams.length > 0 && now - cacheTime < CACHE_TTL) {
      setExams(cachedExams);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await getExams();
      cachedExams = data;
      cacheTime = Date.now();
      setExams(data);
    } catch (e) {
      console.error("useExams:", e);
      setError("Failed to load exams");
      setExams(cachedExams);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { refresh(); }, []);
  return { exams, loading, error, refresh: () => refresh(true) };
}