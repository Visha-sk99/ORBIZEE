"use client";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface Column<T> {
  key: string;
  header: string;
  render: (row: T) => React.ReactNode;
  className?: string;
}

interface Props<T> {
  columns: Column<T>[];
  data: T[];
  loading?: boolean;
  emptyMessage?: string;
}

export default function DataTable<T extends { id: string }>({ columns, data, loading, emptyMessage = "No data found." }: Props<T>) {
  if (loading) return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] overflow-hidden">
      {[...Array(5)].map((_, i) => (
        <div key={i} className="flex gap-4 p-4 border-b border-[var(--border)] animate-pulse">
          {columns.map(c => <div key={c.key} className="h-4 bg-[var(--border)] rounded flex-1" />)}
        </div>
      ))}
    </div>
  );

  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] overflow-hidden">
      {/* Header */}
      <div className="grid border-b border-[var(--border)] bg-[var(--border)]/30 px-4 py-3"
        style={{ gridTemplateColumns: `repeat(${columns.length}, 1fr)` }}>
        {columns.map(c => (
          <p key={c.key} className={cn("text-xs font-mono uppercase tracking-wider text-[var(--muted)]", c.className)}>
            {c.header}
          </p>
        ))}
      </div>

      {/* Rows */}
      {data.length === 0 ? (
        <div className="p-8 text-center text-[var(--muted)] text-sm font-body">{emptyMessage}</div>
      ) : (
        data.map((row, i) => (
          <motion.div
            key={row.id}
            className="grid px-4 py-3 border-b border-[var(--border)] hover:bg-[var(--border)]/20 transition-colors"
            style={{ gridTemplateColumns: `repeat(${columns.length}, 1fr)` }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: i * 0.03 }}
          >
            {columns.map(c => (
              <div key={c.key} className={cn("text-sm text-[var(--text)] flex items-center", c.className)}>
                {c.render(row)}
              </div>
            ))}
          </motion.div>
        ))
      )}
    </div>
  );
}