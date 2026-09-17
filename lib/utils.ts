import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import type { Stream } from "@/types";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(dateStr: string): string {
  if (!dateStr) return "";
  return new Date(dateStr).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function getPercentageColor(pct: number): string {
  if (pct >= 80) return "text-emerald-400";
  if (pct >= 60) return "text-yellow-400";
  return "text-red-400";
}

export function calcPercentage(obtained: number, total: number): number {
  if (total === 0) return 0;
  return Math.round((obtained / total) * 100 * 10) / 10;
}

export const SUBJECTS = ["Physics", "Chemistry", "Mathematics", "Biology"] as const;
export const STREAMS = ["JEE Main", "NEET", "Boards"] as const;

export function streamToSlug(stream: string): string {
  return stream.toLowerCase().replace(/\s+/g, "-");
}

export function slugToStream(slug: string): Stream | null {
  const map: Record<string, Stream> = {
    "jee-main": "JEE Main",
    "neet": "NEET",
    "boards": "Boards",
  };
  return map[slug] ?? null;
}