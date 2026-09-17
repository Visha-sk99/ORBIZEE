"use client";
import { motion } from "framer-motion";
import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  title: string;
  value: string | number;
  icon: LucideIcon;
  trend?: string;
  trendUp?: boolean;
  color?: "blue" | "purple" | "green" | "yellow";
  delay?: number;
}

const COLORS = {
  blue:   { bg: "bg-brand-500/10",   icon: "text-brand-400",   border: "border-brand-500/20" },
  purple: { bg: "bg-purple-500/10",  icon: "text-purple-400",  border: "border-purple-500/20" },
  green:  { bg: "bg-emerald-500/10", icon: "text-emerald-400", border: "border-emerald-500/20" },
  yellow: { bg: "bg-yellow-500/10",  icon: "text-yellow-400",  border: "border-yellow-500/20" },
};

export default function StatsCard({
  title, value, icon: Icon, trend, trendUp, color = "blue", delay = 0,
}: Props) {
  const c = COLORS[color];

  return (
    <motion.div
      className="rounded-2xl p-5 border border-[var(--border)] bg-[var(--surface)] hover:border-brand-400/30 transition-all duration-300"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.4 }}
      whileHover={{ y: -2 }}
    >
      <div className="flex items-start justify-between mb-4">
        <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center border", c.bg, c.border)}>
          <Icon className={cn("w-5 h-5", c.icon)} />
        </div>
        {trend && (
          <span className={cn(
            "text-xs font-sans px-2 py-0.5 rounded-full",
            trendUp ? "bg-emerald-500/10 text-emerald-400" : "bg-red-500/10 text-red-400"
          )}>
            {trendUp ? "↑" : "↓"} {trend}
          </span>
        )}
      </div>

      {/* Value — use span with explicit font-variant-numeric */}
      <p
        className="text-[var(--text)] mb-1 font-bold leading-none"
        style={{ fontSize: 28, fontVariantNumeric: "normal", fontFamily: "system-ui, sans-serif" }}
      >
        {String(value)}
      </p>

      <p className="text-xs text-[var(--muted)] uppercase tracking-wider">
        {title}
      </p>
    </motion.div>
  );
}