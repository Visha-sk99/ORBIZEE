"use client";
import { motion, AnimatePresence } from "framer-motion";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

function ProgressBar({ active }: { active: boolean }) {
  const [width, setWidth] = useState(0);
  useEffect(() => {
    if (!active) { setWidth(0); return; }
    setWidth(30);
    const t1 = setTimeout(() => setWidth(70),  60);
    const t2 = setTimeout(() => setWidth(90), 200);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [active]);

  return (
    <motion.div
      className="fixed top-0 left-0 z-[9999] h-[2px] bg-gradient-to-r from-brand-400 via-brand-500 to-purple-500"
      style={{ width: `${width}%` }}
      animate={{ width: active ? `${width}%` : "100%" }}
      transition={{ duration: active ? 0.3 : 0.1, ease: "easeOut" }}
      initial={false}
    />
  );
}

export default function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [loading, setLoading]               = useState(false);
  const [displayPath, setDisplayPath]       = useState(pathname);
  const [displayChildren, setDisplayChildren] = useState(children);

  useEffect(() => {
    if (pathname === displayPath) {
      // Same path but children updated (data loaded) — update silently
      setDisplayChildren(children);
      return;
    }
    setLoading(true);
    const t = setTimeout(() => {
      setDisplayPath(pathname);
      setDisplayChildren(children);
      setLoading(false);
    }, 60); // reduced from 180ms
    return () => clearTimeout(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname, children]);

  return (
    <>
      <ProgressBar active={loading} />
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={displayPath}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          transition={{ duration: 0.15, ease: "easeOut" }}
          className="h-full w-full"
        >
          {displayChildren}
        </motion.div>
      </AnimatePresence>
    </>
  );
}