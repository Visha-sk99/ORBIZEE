"use client";
import {
  ResponsiveContainer, 
  LineChart as ReLineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip,
} from "recharts";
import { useTheme } from "@/context/ThemeContext";

interface DataPoint { 
  name: string; 
  value: number; 
}

interface Props { 
  data: DataPoint[]; 
  title?: string; 
  color?: string; 
}

export default function LineChart({ data, title, color = "#6b8eff" }: Props) {
  const { theme } = useTheme();
  const textColor = theme === "dark" ? "#6b7280" : "#9ca3af";
  const gridColor = theme === "dark" ? "#1f2937" : "#e5e7eb";

  // Filter out NaN values and ensure valid numbers
  const cleanData = data
    .filter(d => typeof d.value === "number" && !isNaN(d.value))
    .map(d => ({
      ...d,
      value: Math.max(0, Math.min(100, d.value)) // Clamp between 0-100
    }));

  return (
    <div className="w-full">
      {title && <p className="font-display font-semibold text-sm text-[var(--text)] mb-4">{title}</p>}
      
      <ResponsiveContainer width="100%" height={200}>
        <ReLineChart data={cleanData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
          <XAxis 
            dataKey="name" 
            tick={{ fill: textColor, fontSize: 11 }} 
            axisLine={false} 
            tickLine={false} 
          />
          <YAxis 
            tick={{ fill: textColor, fontSize: 11 }} 
            axisLine={false} 
            tickLine={false} 
            domain={[0, 100]} 
          />
          <Tooltip
            contentStyle={{ 
              background: "var(--surface)", 
              border: "1px solid var(--border)", 
              borderRadius: 12, 
              fontSize: 12 
            }}
            labelStyle={{ color: "var(--text)" }}
            formatter={(value: number) => [`${value}%`, "Score"]}
          />
          <Line 
            type="monotone" 
            dataKey="value" 
            stroke={color} 
            strokeWidth={2} 
            dot={{ fill: color, r: 3 }} 
            activeDot={{ r: 5 }} 
          />
        </ReLineChart>
      </ResponsiveContainer>
    </div>
  );
}