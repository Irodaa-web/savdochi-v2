"use client";

import { useEffect } from "react";

/** Xizmat ishchisini ro'yxatdan o'tkazadi (faqat production'da). */
export function PwaRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js").catch(() => {});
  }, []);
  return null;
}
