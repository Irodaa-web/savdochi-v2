"use client";

import { usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "@/lib/apiClient";

const BADGES_EVENT = "savdochi:badges";

export function refreshBadges(): void {
  window.dispatchEvent(new Event(BADGES_EVENT));
}

export type Badges = { cart: number; chats: number; notifications: number };

/** Header belgilari: har 30 soniyada, sahifa almashganda (15 s dan keyin) va `refreshBadges()` chaqirilganda yangilanadi. */
export function useBadges(): [Badges, () => void] {
  const pathname = usePathname();
  const [badges, setBadges] = useState<Badges>({ cart: 0, chats: 0, notifications: 0 });
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

  return [badges, refresh];
}
