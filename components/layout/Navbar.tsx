"use client";
import { motion } from "framer-motion";
import { Menu, Bell, LogOut } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { signOutUser } from "@/firebase/auth";
import ThemeToggle from "@/components/ui/ThemeToggle";
import Image from "next/image";

interface Props { onMenuOpen: () => void; title?: string; }

export default function Navbar({ onMenuOpen, title = "Dashboard" }: Props) {
  const { user, isAdmin } = useAuth();

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between px-4 lg:px-6 h-14 border-b border-[var(--border)] bg-[var(--surface)]/80 backdrop-blur-md">
      {/* Left */}
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuOpen}
          className="lg:hidden p-2 rounded-lg text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--border)] transition-colors"
        >
          <Menu className="w-5 h-5" />
        </button>
        <h2 className="font-display font-semibold text-[var(--text)] text-sm">{title}</h2>
        {isAdmin && (
          <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-mono bg-brand-500/15 text-brand-400 border border-brand-500/20">
            ADMIN
          </span>
        )}
      </div>

      {/* Right */}
      <div className="flex items-center gap-2">
        <ThemeToggle />
        <button className="p-2 rounded-lg text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--border)] transition-colors relative">
          <Bell className="w-4 h-4" />
        </button>
        {user && (
          <div className="flex items-center gap-2 pl-2 border-l border-[var(--border)]">
            {user.photoURL ? (
              <Image
                src={user.photoURL}
                alt={user.displayName || "User"}
                width={28} height={28}
                className="rounded-full ring-2 ring-brand-500/30"
              />
            ) : (
              <div className="w-7 h-7 rounded-full bg-brand-500 flex items-center justify-center text-white text-xs font-bold">
                {user.displayName?.[0] || "U"}
              </div>
            )}
            <button
              onClick={signOutUser}
              className="p-1.5 rounded-lg text-[var(--muted)] hover:text-red-400 hover:bg-red-500/10 transition-colors"
              title="Sign out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </header>
  );
}