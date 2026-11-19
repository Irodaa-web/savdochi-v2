"use client";

import clsx from "clsx";
import { Search } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useI18n } from "@/i18n/client";

export type SearchMode = "companies" | "products";
const STORAGE_KEY = "savdochi.searchMode";

/**
 * Qidiruv + almashtirgich: Kompaniya | Mahsulot (til tanlagichiga o'xshab).
 * Natija katalogda chiqadi: /catalog?q= (kompaniyalar) yoki /catalog?view=products&q= (mahsulotlar).
 * Tanlov brauzerda eslab qolinadi.
 */
export function SearchBox({ className }: { className?: string }) {
  const { t } = useI18n();
  const [mode, setMode] = useState<SearchMode>("companies");
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved === "companies" || saved === "products") setMode(saved);
    } catch {}
  }, []);

  function choose(next: SearchMode) {
    setMode(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {}
    input.current?.focus();
  }

  const placeholder = mode === "companies" ? t.header.search : t.header.searchProducts;

  return (
    <form role="search" action="/catalog" className={className}>
      {mode === "products" && <input type="hidden" name="view" value="products" />}
      <div className="flex h-10 items-center gap-2 rounded-xl border border-[var(--c-glass-border)] bg-[var(--c-glass-strong)] pr-3 pl-1 text-muted shadow-[inset_0_1px_2px_rgb(15_40_90/0.05)] transition-all duration-200 focus-within:border-accent focus-within:ring-4 focus-within:ring-accent/15 hover:border-accent/40">
        <div role="group" aria-label={t.header.searchMode} className="flex shrink-0 rounded-lg bg-surface-2/80 p-0.5">
          {(["companies", "products"] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => choose(m)}
              aria-pressed={m === mode}
              className={clsx(
                "h-7 cursor-pointer rounded-md px-2.5 text-xs font-semibold transition-all duration-200",
                m === mode ? "bg-surface text-accent shadow-sm" : "text-muted hover:text-text",
              )}
            >
              {m === "companies" ? t.header.modeCompanies : t.header.modeProducts}
            </button>
          ))}
        </div>
        <Search size={16} className="shrink-0" aria-hidden />
        <input
          ref={input}
          type="search"
          name="q"
          aria-label={placeholder}
          placeholder={placeholder}
          className="min-w-0 flex-1 bg-transparent text-text outline-none placeholder:text-muted"
        />
      </div>
    </form>
  );
}
