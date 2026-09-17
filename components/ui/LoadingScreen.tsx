"use client";
import { motion } from "framer-motion";

export default function LoadingScreen() {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--bg)]">
      <motion.div
        className="flex flex-col items-center gap-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      >
        {/* Logo mark */}
        <div className="relative w-16 h-16">
          <motion.div
            className="absolute inset-0 rounded-2xl bg-brand-500"
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
            style={{ clipPath: "polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)" }}
          />
          <div className="absolute inset-2 rounded-xl bg-[var(--bg)] flex items-center justify-center">
            <span className="font-display font-bold text-brand-400 text-lg">M</span>
          </div>
        </div>
        <p className="font-display text-[var(--muted)] text-sm tracking-widest uppercase">Loading</p>
        {/* Progress dots */}
        <div className="flex gap-1">
          {[0, 1, 2].map(i => (
            <motion.div
              key={i}
              className="w-1.5 h-1.5 rounded-full bg-brand-400"
              animate={{ opacity: [0.2, 1, 0.2] }}
              transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.2 }}
            />
          ))}
        </div>
      </motion.div>
    </div>
  );
}