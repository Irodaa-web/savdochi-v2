"use client";

import { usePathname } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/apiClient";

const BADGES_EVENT = "savdochi:badges";

export function refreshBadges(): void {
  window.dispatchEvent(new Event(BADGES_EVENT));
}

export type Badges = { cart: number; chats: number; notifications: number };

/** Header belgilari: har 30 soniyada va sahifa almashganda yangilanadi. */
export function useBadges(): [Badges, () => void] {
  const pathname = usePathname();
  const [badges, setBadges] = useState<Badges>({ cart: 0, chats: 0, notifications: 0 });
  const refresh = useCallback(() => {
    void api<Badges>("/api/v1/badges").then((res) => res.ok && setBadges(res.data));
  }, []);

  useEffect(() => {
    refresh();
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
