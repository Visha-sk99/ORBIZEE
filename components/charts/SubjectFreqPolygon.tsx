"use client";
import {
  ResponsiveContainer, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ReferenceLine,
} from "recharts";
import { useTheme } from "@/context/ThemeContext";
import {
  SUBJECT_COLORS, SUBJECTS, SubjectKey,
  ChartRow, SubjectData,
  buildRechartsRows,
} from "@/lib/chartUtils";

// ── Tooltip ───────────────────────────────────────────────────────────────

function CustomTooltip({
  active, payload, label, mode,
}: {
  active?: boolean;
  payload?: { dataKey: string; value: number | null; color: string; payload?: ChartRow }[];
  label?: string;
  mode: "dashboard" | "student";
}) {
  if (!active || !payload?.length) return null;
  const valid = payload.filter(p => p.value !== null && p.value !== undefined);
  if (!valid.length) return null;

  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3 shadow-2xl text-xs min-w-[160px]">
      <p className="font-bold text-[var(--text)] mb-2 border-b border-[var(--border)] pb-1.5">{label}</p>
      {valid.map(p => {
        const row  = p.payload;
        const meta = row?._meta?.[p.dataKey as SubjectKey];
        return (
          <div key={p.dataKey} className="mb-2 last:mb-0">
            <div className="flex items-center gap-1.5 mb-0.5">
              <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: p.color }} />
              <span className="font-bold" style={{ color: p.color }}>{p.dataKey}</span>
            </div>
            {meta?.topic && (
              <p className="text-[var(--muted)] pl-3.5">{meta.topic}</p>
            )}
            {meta && (
              <p className="font-mono font-bold pl-3.5 text-[var(--text)]">
                {meta.obtained}/{meta.maximum}
              </p>
            )}
            <p className="font-mono font-bold pl-3.5" style={{ color: p.color }}>
              {p.value}%
            </p>
            {mode === "dashboard" && (
              <p className="text-[var(--muted)] pl-3.5 text-[10px]">Class Average</p>
            )}
            {meta?.date && (
              <p className="text-[var(--muted)] pl-3.5 text-[10px]">
                {new Date(meta.date).toLocaleDateString("en-IN", {
                  day: "2-digit", month: "short", year: "numeric",
                })}
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Main chart ────────────────────────────────────────────────────────────

interface Props {
  data:    SubjectData;
  mode:    "dashboard" | "student";
  height?: number;
}

export default function SubjectFreqPolygon({ data, mode, height = 260 }: Props) {
  const { theme } = useTheme();
  const gridColor = theme === "dark" ? "#1f2937" : "#e5e7eb";
  const textColor = theme === "dark" ? "#6b7280" : "#9ca3af";

  const rows = buildRechartsRows(data);

  // Only subjects that have at least one real data point
  const activeSubjects = SUBJECTS.filter(s => data[s].length > 0);

  if (rows.length === 0 || activeSubjects.length === 0) {
    return (
      <div className="flex items-center justify-center h-40 text-xs text-[var(--muted)]">
        No exam data yet. Add marks to see the frequency polygon.
      </div>
    );
  }

  // ── Always use LineChart (frequency polygon) ────────────────────────────
  // Even with 1 point: shows a single dot (proper polygon style).
  // With 2+ points: connectNulls bridges gaps where a subject was not tested.
  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={rows} margin={{ top: 12, right: 16, left: -20, bottom: 4 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
        <XAxis
          dataKey="label"
          tick={{ fill: textColor, fontSize: 10 }}
          axisLine={false}
          tickLine={false}
          interval="preserveStartEnd"
        />
        <YAxis
          domain={[0, 100]}
          tick={{ fill: textColor, fontSize: 10 }}
          axisLine={false}
          tickLine={false}
          tickFormatter={v => `${v}%`}
        />
        <ReferenceLine y={33} stroke="#ef4444" strokeDasharray="3 3" strokeWidth={1} />
        <ReferenceLine y={60} stroke="#f59e0b" strokeDasharray="3 3" strokeWidth={1} />
        <ReferenceLine y={80} stroke="#10b981" strokeDasharray="3 3" strokeWidth={1} />
        <Tooltip content={<CustomTooltip mode={mode} />} />
        <Legend
          wrapperStyle={{ fontSize: 11, paddingTop: 12 }}
          iconType="circle"
          iconSize={8}
        />
        {activeSubjects.map(sub => (
          <Line
            key={sub}
            type="monotone"
            dataKey={sub}
            name={sub}
            stroke={SUBJECT_COLORS[sub]}
            strokeWidth={2.5}
            // CRITICAL: connect across exams where this subject was not tested
            connectNulls
            dot={{
              fill: SUBJECT_COLORS[sub],
              r: 5,
              strokeWidth: 2,
              stroke: "var(--surface)",
            }}
            activeDot={{ r: 7, strokeWidth: 0 }}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}