"use client";
import { useEffect, useState } from "react";
import { User } from "firebase/auth";
import { onAuthChange, isAdmin } from "@/firebase/auth";

export function useAuth() {
  const [user, setUser]       = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Safety timeout — never hang forever
    const timeout = setTimeout(() => setLoading(false), 8000);

    const unsub = onAuthChange(u => {
      setUser(u);
      setLoading(false);
      clearTimeout(timeout);
    });

    return () => { unsub(); clearTimeout(timeout); };
  }, []);

  return { user, loading, isAdmin: isAdmin(user?.email) };
}