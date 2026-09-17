"use client";
import {
  ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, Radar, Tooltip,
} from "recharts";
import { useTheme } from "@/context/ThemeContext";

interface Props {
  data: { subject: string; value: number }[];
  title?: string;
}

export default function SubjectChart({ data, title }: Props) {
  const { theme } = useTheme();
  const textColor = theme === "dark" ? "#6b7280" : "#9ca3af";

  return (
    <div className="w-full">
      {title && <p className="font-display font-semibold text-sm text-[var(--text)] mb-4">{title}</p>}
      <ResponsiveContainer width="100%" height={220}>
        <RadarChart data={data}>
          <PolarGrid stroke={theme === "dark" ? "#1f2937" : "#e5e7eb"} />
          <PolarAngleAxis dataKey="subject" tick={{ fill: textColor, fontSize: 11 }} />
          <Radar name="Score" dataKey="value" stroke="#6b8eff" fill="#6b8eff" fillOpacity={0.15} strokeWidth={2} />
          <Tooltip
            contentStyle={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 12, fontSize: 12 }}
          />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}