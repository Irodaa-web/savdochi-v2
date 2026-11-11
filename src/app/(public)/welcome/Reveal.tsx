"use client";

import { useEffect } from "react";

/**
 * Sahifadagi [data-reveal] elementlarini ekranga kirganda ko'rsatadi.
 * JS ishlamasa — html.reveal-on qo'yilmaydi va hamma narsa darhol ko'rinadi.
 */
export function Reveal() {
  useEffect(() => {
    const root = document.documentElement;
    (window as unknown as { __revealReady?: boolean }).__revealReady = true;
    root.classList.add("reveal-on");
    const items = document.querySelectorAll<HTMLElement>("[data-reveal]");
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (!e.isIntersecting) continue;
          e.target.setAttribute("data-shown", "");
          io.unobserve(e.target);
        }
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.12 },
    );
    items.forEach((el) => io.observe(el));
    return () => {
      io.disconnect();
      root.classList.remove("reveal-on");
    };
  }, []);
  return null;
}
