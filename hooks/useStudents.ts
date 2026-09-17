"use client";
import { useEffect, useState, useCallback } from "react";
import { Student } from "@/types";
import { getStudents } from "@/services/studentService";

let cachedStudents: Student[] = [];
let cacheTime = 0;
const CACHE_TTL = 60_000;

export function invalidateStudentsCache() {
  cachedStudents = [];
  cacheTime = 0;
}

export function useStudents() {
  const [students, setStudents] = useState<Student[]>(cachedStudents);
  const [loading, setLoading]   = useState(cachedStudents.length === 0);
  const [error, setError]       = useState<string | null>(null);

  const load = useCallback(async (force = false) => {
    const now = Date.now();
    if (!force && cachedStudents.length > 0 && now - cacheTime < CACHE_TTL) {
      setStudents(cachedStudents);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await getStudents();
      cachedStudents = data;
      cacheTime = Date.now();
      setStudents(data);
    } catch (e) {
      console.error("useStudents:", e);
      setError("Failed to load students");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    // Listen for invalidation from studentService writes
    const handler = () => load(true);
    window.addEventListener("studentCacheInvalidated", handler);
    return () => window.removeEventListener("studentCacheInvalidated", handler);
  }, [load]);

  return { students, loading, error, refresh: () => load(true) };
}