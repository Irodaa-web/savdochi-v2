"use client";

import clsx from "clsx";
import { ChevronDown } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { fmt, useI18n } from "@/i18n/client";
import type { Dictionary } from "@/i18n/dictionaries/uz";
import type { NavItem, NavSection } from "@/lib/navigation";

/** Sichqoncha ustiga kelganda ochilish / ketganda yopilish kechikishi (tasodifiy o'tishda miltillamasin). */
const OPEN_DELAY = 90;
const CLOSE_DELAY = 180;

/**
 * Yuqori menyu: har bir bo'lim — havola; ichki sahifalari bo'lsa, yonida ochiladigan menyu.
 * Sichqoncha: ustiga olib borilsa ochiladi. Klaviatura: ▾ tugmasi (Enter/Space), Esc — yopish.
 * Sensorli ekran: ▾ tugmasini bosish. Sahifa o'zgarsa yoki tashqariga bosilsa — yopiladi.
 */
export function MainNav({ items }: { items: NavItem[] }) {
  const { t } = useI18n();
  const pathname = usePathname();
  const [open, setOpen] = useState<string | null>(null);
  const timer = useRef<number | undefined>(undefined);
  const navRef = useRef<HTMLElement>(null);
  const panels = useRef<Record<string, HTMLDivElement | null>>({});

  useEffect(() => setOpen(null), [pathname]);
  useEffect(() => () => window.clearTimeout(timer.current), []);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (!navRef.current?.contains(e.target as Node)) setOpen(null);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      setOpen(null);
      document.getElementById(`nav-toggle-${open}`)?.focus();
    };
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  // Menyu ekrandan chiqib ketmasin: o'ng chekkadan oshsa, chapga suriladi.
  useLayoutEffect(() => {
    if (!open) return;
    const el = panels.current[open];
    if (!el) return;
    el.style.left = "0px";
    const over = el.getBoundingClientRect().right - (window.innerWidth - 12);
    if (over > 0) el.style.left = `${-over}px`;
  }, [open]);

  const schedule = (key: string | null, delay: number) => {
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setOpen(key), delay);
  };

  return (
    <nav ref={navRef} aria-label={t.navMenu.label} className="hidden md:block">
      <ul className="flex items-center gap-1">
        {items.map((item) => {
          const key = item.href.slice(1);
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
          const isOpen = open === key;
          const name = t.nav[item.label];
          return (
            <li
              key={key}
              className="relative"
              onPointerEnter={(e) => item.menu && e.pointerType === "mouse" && schedule(key, open ? 0 : OPEN_DELAY)}
              onPointerLeave={(e) => item.menu && e.pointerType === "mouse" && schedule(null, CLOSE_DELAY)}
              onBlur={(e) => {
                if (isOpen && !e.currentTarget.contains(e.relatedTarget as Node | null)) setOpen(null);
              }}
            >
              <div
                className={clsx(
                  "flex items-center rounded-xl transition-colors duration-200",
                  active ? "bg-accent-soft text-accent" : isOpen ? "bg-surface-2/80 text-text" : "text-muted hover:bg-surface-2/80 hover:text-text",
                )}
              >
                <Link
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={clsx("flex items-center gap-2 rounded-xl py-2 text-[14px] font-medium", item.menu ? "pr-1 pl-3" : "px-3")}
                >
                  <item.Icon size={16} aria-hidden className={active ? "" : "opacity-75"} />
                  {name}
                </Link>
                {item.menu && (
                  <button
                    id={`nav-toggle-${key}`}
                    type="button"
                    aria-expanded={isOpen}
                    aria-controls={`nav-menu-${key}`}
                    aria-label={fmt(t.navMenu.toggle, { name })}
                    onClick={() => {
                      window.clearTimeout(timer.current);
                      setOpen(isOpen ? null : key);
                    }}
                    className="mr-1 flex size-6 cursor-pointer items-center justify-center rounded-md transition-colors hover:bg-black/5 dark:hover:bg-white/10"
                  >
                    <ChevronDown size={14} aria-hidden className={clsx("transition-transform duration-200", isOpen && "rotate-180")} />
                  </button>
                )}
              </div>

              {item.menu && (
                <div
                  id={`nav-menu-${key}`}
                  ref={(el) => {
                    panels.current[key] = el;
                  }}
                  data-open={isOpen}
                  className="invisible absolute top-full z-40 translate-y-1 pt-2 opacity-0 transition-[opacity,translate,visibility] duration-200 data-[open=true]:visible data-[open=true]:translate-y-0 data-[open=true]:opacity-100"
                >
                  <MenuPanel sections={item.menu} t={t} pathname={pathname} onNavigate={() => setOpen(null)} />
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

/** Ochiladigan menyu paneli: bo'limlar (sarlavha + havolalar). Izohli havolalar — katta, izohsizlari — ixcham. */
function MenuPanel({ sections, t, pathname, onNavigate }: { sections: NavSection[]; t: Dictionary; pathname: string; onNavigate: () => void }) {
  return (
    <div
      className={clsx(
        "glass-strong rounded-2xl p-2",
        sections.length > 1
          ? "grid w-[min(720px,calc(100vw-24px))] gap-1"
          : sections[0]?.columns === 2
            ? "w-[min(420px,calc(100vw-24px))]"
            : "w-[min(340px,calc(100vw-24px))]",
      )}
      // Ikki ustunli (ixcham) bo'limga ko'proq joy: nomlar qisqarmasin.
      style={sections.length > 1 ? { gridTemplateColumns: sections.map((s) => (s.columns === 2 ? "minmax(0,1.15fr)" : "minmax(0,0.85fr)")).join(" ") } : undefined}
    >
      {sections.map((section) => (
        <div key={section.title(t)} className="flex min-w-0 flex-col p-1">
          <p className="px-2.5 pt-1.5 pb-2 text-[11px] font-semibold tracking-wider text-muted uppercase">{section.title(t)}</p>
          <ul className={clsx(section.columns === 2 ? "grid grid-cols-2 gap-0.5" : "flex flex-col gap-0.5")}>
            {section.links.map((link) => {
              const current = !link.href.includes("?") && !link.href.includes("#") && link.href === pathname;
              const hint = link.hint?.(t);
              return (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    onClick={onNavigate}
                    aria-current={current ? "page" : undefined}
                    className={clsx(
                      "group/link flex gap-3 rounded-xl transition-colors duration-150 hover:bg-accent-soft/70 focus-visible:bg-accent-soft/70",
                      hint ? "items-start p-2.5" : "items-center px-2.5 py-2",
                      current && "bg-accent-soft/70",
                    )}
                  >
                    <span
                      className={clsx(
                        "flex shrink-0 items-center justify-center rounded-lg bg-accent-soft text-accent transition-all duration-200 group-hover/link:bg-accent group-hover/link:text-accent-fg group-hover/link:shadow-[var(--c-glow)]",
                        hint ? "size-9" : "size-7",
                      )}
                    >
                      <link.Icon size={hint ? 17 : 15} aria-hidden />
                    </span>
                    <span className="min-w-0">
                      <span className="block text-[14px] leading-tight font-semibold text-text">{link.label(t)}</span>
                      {hint && <span className="block text-[12px] leading-snug text-muted">{hint}</span>}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </div>
  );
}
