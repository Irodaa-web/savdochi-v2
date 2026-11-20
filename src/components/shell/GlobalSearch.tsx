"use client";

import clsx from "clsx";
import { ArrowRight, BadgeCheck, Building2, Loader2, Search, X } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { ProductImage } from "@/components/catalog/ProductImage";
import { fmt, useI18n } from "@/i18n/client";
import { api } from "@/lib/apiClient";
import { formatAmount, type CategoryCode, type UnitCode } from "@/lib/catalog";
import type { RegionCode } from "@/lib/regions";

type Result = {
  products: { id: string; name: string; price: number; unit: UnitCode; category: CategoryCode; image: string | null; seller: string }[];
  companies: { id: string; name: string; region: RegionCode; verified: boolean; productCount: number }[];
  totalProducts: number;
};
type Option = { key: string; href: string };

/**
 * Yagona qidiruv: mahsulot va kompaniyalarni birga qidiradi.
 * Yozish bilan takliflar chiqadi (mahsulotlar + kompaniyalar), ↑/↓ va Enter bilan boshqariladi.
 * Enter — barcha mos mahsulotlar katalogda ochiladi. Katalogdagi joriy so'z maydonda turadi.
 */
export function GlobalSearch({ className }: { className?: string }) {
  const { t } = useI18n();
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const urlQ = pathname === "/catalog" && !params.get("seller") ? (params.get("q") ?? "") : "";
  const [q, setQ] = useState(urlQ);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const [active, setActive] = useState(-1);
  const box = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const listId = useId();
  const term = q.trim();

  // Boshqa sahifaga o'tilganda: takliflar yopiladi, maydonda katalogdagi so'z qoladi.
  useEffect(() => {
    setQ(urlQ);
    setOpen(false);
  }, [pathname, urlQ]);

  // Yozish to'xtagach 250 ms kutib so'raymiz; eski javob yangisini bosib ketmaydi.
  useEffect(() => {
    if (term.length < 2) {
      setResult(null);
      setLoading(false);
      return;
    }
    let live = true;
    setLoading(true);
    const timer = setTimeout(async () => {
      const res = await api<Result>(`/api/v1/search?q=${encodeURIComponent(term)}`);
      if (!live) return;
      setLoading(false);
      setResult(res.ok ? res.data : { products: [], companies: [], totalProducts: 0 });
      setActive(-1);
    }, 250);
    return () => {
      live = false;
      clearTimeout(timer);
    };
  }, [term]);

  // "/" tugmasi — qidiruvga o'tish (boshqa maydonda yozilmayotgan bo'lsa).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement;
      if (e.key !== "/" || e.ctrlKey || e.metaKey || el.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName)) return;
      e.preventDefault();
      input.current?.focus();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  // Tashqariga bosilsa yopiladi.
  useEffect(() => {
    if (!open) return;
    const onPointer = (e: PointerEvent) => box.current && !box.current.contains(e.target as Node) && setOpen(false);
    document.addEventListener("pointerdown", onPointer);
    return () => document.removeEventListener("pointerdown", onPointer);
  }, [open]);

  const allProducts = `/catalog?view=products&q=${encodeURIComponent(term)}`;
  const allCompanies = `/catalog?q=${encodeURIComponent(term)}`;
  const options: Option[] = useMemo(() => {
    if (!result) return [];
    return [
      ...result.products.map((p) => ({ key: `p${p.id}`, href: `/catalog/${p.id}` })),
      ...result.companies.map((c) => ({ key: `c${c.id}`, href: `/catalog?seller=${c.id}` })),
      { key: "all-products", href: allProducts },
      { key: "all-companies", href: allCompanies },
    ];
  }, [result, allProducts, allCompanies]);
  const indexOf = (key: string) => options.findIndex((o) => o.key === key);
  const showPanel = open && term.length >= 2;

  function go(href: string) {
    setOpen(false);
    input.current?.blur();
    router.push(href);
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Escape") {
      if (open) setOpen(false);
      else setQ("");
      return;
    }
    if (!showPanel || !options.length) return;
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      const step = e.key === "ArrowDown" ? 1 : -1;
      // -1 — hech biri tanlanmagan (Enter barcha mahsulotlarni ochadi).
      setActive((i) => {
        const next = i + step;
        return next >= options.length ? -1 : next < -1 ? options.length - 1 : next;
      });
    }
  }

  const optionClass = (key: string) =>
    clsx("flex items-center gap-3 rounded-xl px-2.5 py-2 transition-colors", options[active]?.key === key ? "bg-accent-soft text-accent" : "hover:bg-surface-2/80");

  return (
    <div ref={box} className={clsx("relative", className)}>
      <form
        role="search"
        onSubmit={(e) => {
          e.preventDefault();
          const picked = options[active];
          if (picked) go(picked.href);
          else if (term) go(allProducts);
        }}
      >
        <label className="group flex h-10 items-center gap-2 rounded-xl border border-[var(--c-glass-border)] bg-[var(--c-glass-strong)] px-3 text-muted shadow-[inset_0_1px_2px_rgb(15_40_90/0.06),0_1px_0_var(--c-glass-highlight)] transition-all duration-200 focus-within:border-accent focus-within:ring-4 focus-within:ring-accent/15 hover:border-accent/40">
          {loading ? <Loader2 size={16} className="shrink-0 animate-spin text-accent" aria-hidden /> : <Search size={16} className="shrink-0 group-focus-within:text-accent" aria-hidden />}
          <input
            ref={input}
            type="search"
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setOpen(true);
            }}
            onFocus={() => setOpen(true)}
            onKeyDown={onKeyDown}
            placeholder={t.search.placeholder}
            aria-label={t.search.placeholder}
            role="combobox"
            aria-expanded={showPanel}
            aria-controls={listId}
            aria-autocomplete="list"
            aria-activedescendant={options[active] ? `${listId}-${options[active].key}` : undefined}
            autoComplete="off"
            enterKeyHint="search"
            className="min-w-0 flex-1 bg-transparent text-[14px] text-text outline-none placeholder:text-muted focus-none [&::-webkit-search-cancel-button]:hidden"
          />
          {q && (
            <button
              type="button"
              onClick={() => {
                setQ("");
                input.current?.focus();
              }}
              aria-label={t.search.clear}
              className="flex size-6 shrink-0 cursor-pointer items-center justify-center rounded-md text-muted hover:bg-surface-2 hover:text-text"
            >
              <X size={14} aria-hidden />
            </button>
          )}
          <kbd className="hidden shrink-0 rounded-md border border-line px-1.5 text-[11px] leading-5 font-medium text-muted xl:block">/</kbd>
        </label>
      </form>

      {showPanel && (
        <div
          id={listId}
          role="listbox"
          aria-label={t.search.placeholder}
          className="glass-strong menu-in fixed inset-x-3 top-[68px] z-50 max-h-[min(70dvh,560px)] overflow-y-auto rounded-2xl p-2 text-text sm:absolute sm:inset-x-0 sm:top-12 sm:min-w-[420px]"
        >
          {!result ? (
            <p className="px-3 py-6 text-center text-[13px] text-muted">{t.search.loading}</p>
          ) : (
            <>
              {result.products.length > 0 && (
                <Group title={t.search.products} count={result.totalProducts}>
                  {result.products.map((p) => (
                    <Link key={p.id} id={`${listId}-p${p.id}`} role="option" aria-selected={active === indexOf(`p${p.id}`)} href={`/catalog/${p.id}`} onClick={() => setOpen(false)} className={optionClass(`p${p.id}`)}>
                      <ProductImage src={p.image} name={p.name} category={p.category} sizes="40px" className="size-10 shrink-0 overflow-hidden rounded-lg" />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[14px] font-medium"><Mark text={p.name} term={term} /></span>
                        <span className="block truncate text-[12px] text-muted">{p.seller}</span>
                      </span>
                      <span className="shrink-0 text-right text-[13px] font-semibold text-text">
                        {formatAmount(p.price)}
                        <span className="block text-[11px] font-normal text-muted">{fmt(t.catalog.perUnit, { unit: t.units[p.unit] })}</span>
                      </span>
                    </Link>
                  ))}
                </Group>
              )}
              {result.companies.length > 0 && (
                <Group title={t.search.companies} count={result.companies.length}>
                  {result.companies.map((c) => (
                    <Link key={c.id} id={`${listId}-c${c.id}`} role="option" aria-selected={active === indexOf(`c${c.id}`)} href={`/catalog?seller=${c.id}`} onClick={() => setOpen(false)} className={optionClass(`c${c.id}`)}>
                      <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-accent-soft text-accent">
                        <Building2 size={18} aria-hidden />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-1 truncate text-[14px] font-medium">
                          <Mark text={c.name} term={term} />
                          {c.verified && <BadgeCheck size={14} className="shrink-0 text-accent" aria-label={t.catalog.verified} />}
                        </span>
                        <span className="block truncate text-[12px] text-muted">
                          {t.regions[c.region]} · {fmt(t.catalog.count, { n: c.productCount })}
                        </span>
                      </span>
                    </Link>
                  ))}
                </Group>
              )}
              {!result.products.length && !result.companies.length && (
                <div className="flex flex-col items-center gap-1 px-3 py-6 text-center">
                  <Search size={22} className="text-muted" aria-hidden />
                  <p className="text-[14px] font-medium">{t.search.empty}</p>
                </div>
              )}
              <div className="mt-1 grid gap-1 border-t border-line/70 pt-2 sm:grid-cols-2">
                {[
                  { key: "all-products", href: allProducts, label: fmt(t.search.allProducts, { q: term }) },
                  { key: "all-companies", href: allCompanies, label: fmt(t.search.allCompanies, { q: term }) },
                ].map((o) => (
                  <Link key={o.key} id={`${listId}-${o.key}`} role="option" aria-selected={active === indexOf(o.key)} href={o.href} onClick={() => setOpen(false)} className={clsx(optionClass(o.key), "text-[13px] font-semibold text-accent")}>
                    <span className="min-w-0 flex-1 truncate">{o.label}</span>
                    <ArrowRight size={14} className="shrink-0" aria-hidden />
                  </Link>
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

function Group({ title, count, children }: { title: string; count: number; children: React.ReactNode }) {
  return (
    <div className="mb-1">
      <p className="flex items-center justify-between px-2.5 pt-1.5 pb-1 text-[11px] font-semibold tracking-wider text-muted uppercase">
        {title}
        <span className="rounded-full bg-surface-2 px-2 text-[11px] leading-5 tracking-normal">{count}</span>
      </p>
      {children}
    </div>
  );
}

/** Mos kelgan qismni ajratib ko'rsatadi. */
function Mark({ text, term }: { text: string; term: string }) {
  const i = text.toLowerCase().indexOf(term.toLowerCase());
  if (i < 0 || !term) return <>{text}</>;
  return (
    <>
      {text.slice(0, i)}
      <mark className="rounded-sm bg-accent-soft text-accent">{text.slice(i, i + term.length)}</mark>
      {text.slice(i + term.length)}
    </>
  );
}
