"use client";

import { usePathname } from "next/navigation";
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { api } from "@/lib/apiClient";

const BADGES_EVENT = "savdochi:badges";

export function refreshBadges(): void {
  window.dispatchEvent(new Event(BADGES_EVENT));
}

/** tickets — administrator uchun javob kutayotgan murojaatlar. */
export type Badges = { cart: number; chats: number; notifications: number; orders: number; tickets: number };

const BadgesContext = createContext<[Badges, () => void] | null>(null);

/**
 * Belgilar (savat, chat, bildirishnomalar) — bitta joyda: header ham, telefondagi pastki panel ham
 * shu qiymatdan foydalanadi (so'rovlar ikki baravar ko'paymaydi).
 * Har 30 soniyada, sahifa almashganda (15 s dan keyin) va `refreshBadges()` chaqirilganda yangilanadi.
 */
export function BadgesProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [badges, setBadges] = useState<Badges>({ cart: 0, chats: 0, notifications: 0, orders: 0, tickets: 0 });
  const last = useRef(0);
  const refresh = useCallback(() => {
    last.current = Date.now();
    void api<Badges>("/api/v1/badges").then((res) => res.ok && setBadges(res.data));
  }, []);

  // Sahifa almashganda — lekin 15 soniyada bir martadan ko'p emas (har bosishda qo'shimcha so'rov bo'lmasin).
  useEffect(() => {
    if (Date.now() - last.current > 15_000) refresh();
  }, [pathname, refresh]);

  // Savat yoki xabar o'zgarganda boshqa komponentlar `refreshBadges()` chaqiradi.
  useEffect(() => {
    window.addEventListener(BADGES_EVENT, refresh);
    return () => window.removeEventListener(BADGES_EVENT, refresh);
  }, [refresh]);

  useEffect(() => {
    const timer = setInterval(() => document.visibilityState === "visible" && refresh(), 30_000);
    return () => clearInterval(timer);
  }, [refresh]);

  return <BadgesContext.Provider value={[badges, refresh]}>{children}</BadgesContext.Provider>;
}

export function useBadges(): [Badges, () => void] {
  const value = useContext(BadgesContext);
  if (!value) throw new Error("useBadges must be used inside BadgesProvider");
  return value;
}
