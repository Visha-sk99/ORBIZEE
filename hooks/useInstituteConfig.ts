"use client";
import { useEffect, useState } from "react";
import { db } from "@/firebase/config";
import { doc, getDoc } from "firebase/firestore";

interface DivisionConfig {
  standard: string;
  divisions: string[];
}

export interface InstituteConfig {
  standards: DivisionConfig[];
}

const DEFAULT: InstituteConfig = {
  standards: [
    { standard: "11", divisions: ["A", "B"] },
    { standard: "12", divisions: ["A", "B"] },
  ],
};

// Module-level promise cache — shared across all calls, no React needed
let configPromise: Promise<InstituteConfig> | null = null;
let cachedResult: InstituteConfig | null = null;
let cacheTime = 0;
const CACHE_TTL = 30_000;

async function fetchConfig(): Promise<InstituteConfig> {
  const now = Date.now();
  if (cachedResult && now - cacheTime < CACHE_TTL) return cachedResult;
  if (configPromise) return configPromise;

  configPromise = getDoc(doc(db, "settings", "instituteConfig")).then(snap => {
    const data = snap.exists() ? (snap.data() as InstituteConfig) : DEFAULT;
    cachedResult = data;
    cacheTime = Date.now();
    configPromise = null;
    return data;
  }).catch(() => {
    configPromise = null;
    return DEFAULT;
  });

  return configPromise;
}

export function clearInstituteCache() {
  cachedResult = null;
  cacheTime = 0;
  configPromise = null;
}

// ── React hook — only call this from top-level components ─────────────────
export function useInstituteConfig() {
  const [config, setConfig]   = useState<InstituteConfig>(cachedResult || DEFAULT);
  const [loading, setLoading] = useState(!cachedResult);

  useEffect(() => {
    let cancelled = false;
    fetchConfig().then(data => {
      if (!cancelled) { setConfig(data); setLoading(false); }
    });
    return () => { cancelled = true; };
  }, []);

  const allDivisions = config.standards.flatMap(s =>
    s.divisions.map(d => `${s.standard}${d}`)
  );

  const allStandards = config.standards.map(s => s.standard);

  const divisionsForStandard = (std: string) =>
    (config.standards.find(s => s.standard === std)?.divisions || [])
      .map(d => `${std}${d}`);

  const refresh = () => {
    clearInstituteCache();
    setLoading(true);
    fetchConfig().then(data => { setConfig(data); setLoading(false); });
  };

  return { config, loading, allDivisions, allStandards, divisionsForStandard, refresh };
}