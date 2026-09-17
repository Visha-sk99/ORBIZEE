"use client";
import { usePathname, useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import {
  LayoutDashboard, Users, Trophy, BookOpen,
  ClipboardList, Settings, FlaskConical, X, Network,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

const NAV: { href: string; icon: LucideIcon; label: string }[] = [
  { href: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { href: "/hub",       icon: Network,         label: "Hub"       },
  { href: "/students",  icon: Users,           label: "Students"  },
  { href: "/rankings",  icon: Trophy,          label: "Rankings"  },
  { href: "/exams",     icon: BookOpen,        label: "Exams"     },
  { href: "/marks",     icon: ClipboardList,   label: "Marks"     },
  { href: "/settings",  icon: Settings,        label: "Settings"  },
];

function NavItem({
  href, icon: Icon, label, onClose,
}: {
  href: string; icon: LucideIcon; label: string; onClose: () => void;
}) {
  const pathname = usePathname();
  const router   = useRouter();
  const active   = pathname === href ||
    (href !== "/dashboard" && pathname.startsWith(href));

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    onClose();
    router.push(href);
  };

  return (
    <motion.a
      href={href}
      onClick={handleClick}
      className={cn(
        "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium",
        "cursor-pointer select-none transition-colors duration-100",
        active
          ? "bg-brand-500 text-black shadow-lg shadow-brand-500/25"
          : "text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--border)]"
      )}
      whileTap={{ scale: 0.97 }}
      transition={{ duration: 0.08 }}
    >
      <Icon className={cn(
        "w-4 h-4 flex-shrink-0",
        active ? "text-black" : "text-[var(--muted)]"
      )} />
      <span>{label}</span>
      {active && (
        <motion.span
          layoutId="nav-dot"
          className="ml-auto w-1.5 h-1.5 rounded-full bg-black/50"
          transition={{ duration: 0.18 }}
        />
      )}
    </motion.a>
  );
}

function SidebarContent({ onClose }: { onClose: () => void }) {
  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-3 px-5 py-6 border-b border-[var(--border)]">
        {/* Gold logo — no purple */}
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-brand-400 to-brand-600 flex items-center justify-center flex-shrink-0 shadow-md shadow-brand-500/20">
          <FlaskConical className="w-5 h-5 text-black" />
        </div>
        <div>
          <p className="font-bold text-[var(--text)] text-sm leading-tight">ORBIZEE</p>
          <p className="text-[10px] text-[var(--muted)] uppercase tracking-widest">Institute</p>
        </div>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-0.5">
        {NAV.map(item => (
          <NavItem key={item.href} {...item} onClose={onClose} />
        ))}
      </nav>

      <div className="px-5 py-4 border-t border-[var(--border)]">
        <p className="text-[10px] text-[var(--muted)] text-center">v1.0 · ORBIZEE</p>
      </div>
    </div>
  );
}

interface Props { open: boolean; onClose: () => void; }

export default function Sidebar({ open, onClose }: Props) {
  return (
    <>
      <aside className="hidden lg:flex flex-col w-60 border-r border-[var(--border)] bg-[var(--surface)] h-screen sticky top-0 shrink-0">
        <SidebarContent onClose={onClose} />
      </aside>

      <AnimatePresence>
        {open && (
          <>
            <motion.div
              className="fixed inset-0 z-40 bg-black/60 lg:hidden"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              onClick={onClose}
            />
            <motion.aside
              className="fixed left-0 top-0 z-50 h-full w-64 bg-[var(--surface)] border-r border-[var(--border)] lg:hidden"
              initial={{ x: -264 }} animate={{ x: 0 }} exit={{ x: -264 }}
              transition={{ type: "spring", damping: 30, stiffness: 350 }}
            >
              <button onClick={onClose}
                className="absolute top-4 right-4 p-1.5 rounded-lg text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--border)] transition-colors">
                <X className="w-4 h-4" />
              </button>
              <SidebarContent onClose={onClose} />
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
}