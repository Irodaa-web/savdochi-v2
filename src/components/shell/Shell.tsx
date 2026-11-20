"use client";

import { usePathname } from "next/navigation";
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";

type Shell = {
  /** Telefon/planshetda chapdan chiqadigan menyu ochiqmi. */
  drawer: boolean;
  setDrawer: (open: boolean) => void;
  /** Kompyuterda sidebar yig'ilganmi (faqat belgilar). Cookie'da eslab qolinadi. */
  collapsed: boolean;
  toggleCollapsed: () => void;
};

const ShellContext = createContext<Shell | null>(null);

export function ShellProvider({ initialCollapsed, children }: { initialCollapsed: boolean; children: ReactNode }) {
  const pathname = usePathname();
  const [drawer, setDrawer] = useState(false);
  const [collapsed, setCollapsed] = useState(initialCollapsed);

  // Boshqa sahifaga o'tilganda telefondagi menyu yopiladi.
  useEffect(() => setDrawer(false), [pathname]);

  // Menyu ochiqligida orqadagi sahifa aylanmaydi; Esc — yopadi.
  useEffect(() => {
    if (!drawer) return;
    const root = document.documentElement;
    const prev = root.style.overflow;
    root.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setDrawer(false);
    document.addEventListener("keydown", onKey);
    return () => {
      root.style.overflow = prev;
      document.removeEventListener("keydown", onKey);
    };
  }, [drawer]);

  const toggleCollapsed = useCallback(() => {
    setCollapsed((v) => {
      document.cookie = `sidebar=${v ? "open" : "collapsed"}; path=/; max-age=31536000; samesite=lax`;
      return !v;
    });
  }, []);

  return <ShellContext.Provider value={{ drawer, setDrawer, collapsed, toggleCollapsed }}>{children}</ShellContext.Provider>;
}

export function useShell(): Shell {
  const value = useContext(ShellContext);
  if (!value) throw new Error("useShell must be used inside ShellProvider");
  return value;
}
