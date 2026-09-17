"use client";
import { useState } from "react";
import Sidebar from "@/components/layout/Sidebar";
import Navbar from "@/components/layout/Navbar";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import PageTransition from "@/components/layout/PageTransition";
import { usePathname } from "next/navigation";

const TITLES: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/hub":       "Hub",
  "/students":  "Students",
  "/rankings":  "Rankings",
  "/exams":     "Exams",
  "/marks":     "Marks Entry",
  "/settings":  "Settings",
};

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const path = usePathname();

  const title =
    TITLES[path] ||
    (path.startsWith("/students/") ? "Student Profile" : "") ||
    (path.startsWith("/hub/")      ? `Hub · ${path.split("/hub/")[1]}` : "") ||
    "MRK'S SCIENCE";

  return (
    <ProtectedRoute>
      <div className="flex h-screen overflow-hidden bg-[var(--bg)]">
        <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        <div className="flex-1 flex flex-col overflow-hidden">
          <Navbar onMenuOpen={() => setSidebarOpen(true)} title={title} />
          <main className="flex-1 overflow-y-auto p-4 lg:p-6 scrollbar-hide">
            <PageTransition>
              {children}
            </PageTransition>
          </main>
        </div>
      </div>
    </ProtectedRoute>
  );
}