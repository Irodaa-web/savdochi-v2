import clsx from "clsx";
import { ArrowLeft, Building2, Package, PackageCheck, PackageSearch, Search, ShieldAlert } from "lucide-react";
import { PageTitle } from "@/components/ui/Card";
import Link from "next/link";
import { ProductCard } from "@/components/catalog/ProductCard";
import { RegionFilter } from "@/components/catalog/RegionFilter";
import { SupplierCard } from "@/components/catalog/SupplierCard";
import { EmptyState } from "@/components/ui/EmptyState";
import type { Dictionary } from "@/i18n/dictionaries/uz";
import { fmt } from "@/i18n/format";
import { getDictionary, getLocale } from "@/i18n/server";
import { requireUser } from "@/lib/auth/guard";
import { CATEGORY_CODES, type CategoryCode } from "@/lib/catalog";
import { REGION_CODES, type RegionCode } from "@/lib/regions";
import { CATEGORY_ICONS } from "@/lib/navigation";
import { categoryCounts, getProductSeller, listCatalog, listSuppliers, type CatalogSort } from "@/server/products";

type Params = { q?: string; category?: string; seller?: string; page?: string; view?: string; region?: string; sort?: string; stock?: string };
const SORT_KEYS = ["new", "cheap", "expensive"] as const;
const sortOf = (sp: Params): CatalogSort => (SORT_KEYS as readonly string[]).includes(sp.sort ?? "") ? (sp.sort as CatalogSort) : "new";

function hrefWith(current: Params, patch: Partial<Params>): string {
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries({ ...current, ...patch })) if (v) params.set(k, v);
  const s = params.toString();
  return s ? `/catalog?${s}` : "/catalog";
}

/**
 * Katalog ikki ko'rinishda: Kompaniyalar (asosiy) va Mahsulotlar — tepadagi almashtirgich orqali.
 * Bitta kompaniya (?seller=) yoki kategoriya tanlansa — mahsulotlar ko'rinadi.
 */
export default async function CatalogPage({ searchParams }: { searchParams: Promise<Params> }) {
  const user = await requireUser();
  const t = getDictionary(await getLocale());
  const sp = await searchParams;
  const q = sp.q?.trim() || undefined;
  const category = (CATEGORY_CODES as readonly string[]).includes(sp.category ?? "") ? (sp.category as CategoryCode) : undefined;
  const view = sp.seller || category || sp.view === "products" ? "products" : "companies";

  return (
    <section className="flex flex-col gap-5">
      {user.role === "buyer" && user.verification !== "verified" && (
        <div className="flex items-start gap-3 rounded-xl border border-line bg-accent-soft px-4 py-3">
          <ShieldAlert size={18} className="mt-0.5 shrink-0 text-accent" aria-hidden />
          <p className="text-[13px] leading-relaxed">{t.home.verifyNote}</p>
        </div>
      )}
      {sp.seller ? (
        <SellerProducts sp={sp} q={q} category={category} t={t} />
      ) : view === "products" ? (
        <AllProducts sp={sp} q={q} category={category} t={t} />
      ) : (
        <Companies sp={sp} q={q} t={t} />
      )}
    </section>
  );
}

/** Kompaniyalar | Mahsulotlar almashtirgichi. Qidiruv so'zi saqlanadi. */
function ViewSwitch({ view, q, t }: { view: "companies" | "products"; q?: string; t: Dictionary }) {
  const tabs = [
    { key: "companies", label: t.catalog.companiesTab, Icon: Building2, href: hrefWith({}, { q }) },
    { key: "products", label: t.catalog.productsTab, Icon: Package, href: hrefWith({}, { q, view: "products" }) },
  ] as const;
  return (
    <div role="group" aria-label={t.catalog.viewSwitch} className="inline-flex rounded-lg bg-surface-2 p-1">
      {tabs.map(({ key, label, Icon, href }) => (
        <Link
          key={key}
          href={href}
          aria-current={view === key ? "page" : undefined}
          className={clsx(
            "flex h-9 items-center gap-1.5 rounded-md px-3.5 text-[13px] font-semibold transition-colors",
            view === key ? "bg-surface text-text shadow-sm" : "text-muted hover:text-text",
          )}
        >
          <Icon size={16} aria-hidden />
          {label}
        </Link>
      ))}
    </div>
  );
}

/** Sahifa ichidagi qidiruv (telefonda; kompyuterda yuqoridagi qidiruv bor). */
function PageSearch({ hidden, placeholder, q, className }: { hidden: Record<string, string | undefined>; placeholder: string; q?: string; className?: string }) {
  return (
    <form action="/catalog" role="search" className={clsx("w-full sm:w-80", className)}>
      {Object.entries(hidden).map(([k, v]) => v && <input key={k} type="hidden" name={k} value={v} />)}
      <label className="flex h-10 items-center gap-2 rounded-lg border border-line bg-surface px-3 text-muted focus-within:border-accent">
        <Search size={16} aria-hidden />
        <input type="search" name="q" defaultValue={q} placeholder={placeholder} aria-label={placeholder} className="min-w-0 flex-1 bg-transparent text-text outline-none" />
      </label>
    </form>
  );
}

function Header({ title, count, children }: { title: string; count: string; children?: React.ReactNode }) {
  return (
    <PageTitle lead={count} action={children}>
      {title}
    </PageTitle>
  );
}

async function Companies({ sp, q, t }: { sp: Params; q?: string; t: Dictionary }) {
  const region = (REGION_CODES as readonly string[]).includes(sp.region ?? "") ? (sp.region as RegionCode) : undefined;
  // Qidiruv bo'lmasa: kompaniyalar ostida kategoriyalar va yangi mahsulotlar (katalogning "vitrinasi").
  const [suppliers, counts, latest] = await Promise.all([listSuppliers({ region, q }), q ? null : categoryCounts(), q ? null : listCatalog({})]);
  return (
    <>
      <Header title={q ? fmt(t.suppliers.resultsFor, { q }) : t.catalog.title} count={fmt(t.suppliers.count, { n: suppliers.length })}>
        <div className="flex w-full flex-wrap gap-2 sm:w-auto">
          <PageSearch hidden={{ region }} q={q} placeholder={t.header.search} className="min-w-0 flex-1 sm:flex-none lg:hidden" />
          <RegionFilter value={region ?? ""} q={q} base="/catalog" />
        </div>
      </Header>
      <ViewSwitch view="companies" q={q} t={t} />
      {suppliers.length ? (
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {suppliers.map((s) => (
            <SupplierCard key={s.id} supplier={s} t={t} />
          ))}
        </ul>
      ) : (
        <EmptyState Icon={Building2} title={q ? t.suppliers.notFound : t.catalog.companiesEmpty} hint={q ? t.suppliers.notFoundHint : undefined} />
      )}

      {counts && (
        <section className="flex flex-col gap-3">
          <h2 className="text-[17px] font-bold">{t.catalog.byCategory}</h2>
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {CATEGORY_CODES.map((c) => {
              const Icon = CATEGORY_ICONS[c];
              return (
                <li key={c}>
                  <Link
                    href={hrefWith({}, { category: c })}
                    className="group glass-card sheen flex h-full flex-col gap-3 rounded-2xl p-4 transition-all duration-300 hover:-translate-y-1 hover:border-accent/40 hover:shadow-[var(--c-shadow-lg)]"
                  >
                    <span className="flex size-10 items-center justify-center rounded-xl bg-accent-soft text-accent transition-all duration-300 group-hover:bg-accent group-hover:text-accent-fg group-hover:shadow-[var(--c-glow)]">
                      <Icon size={20} aria-hidden />
                    </span>
                    <span className="leading-tight font-semibold">{t.categories[c]}</span>
                    <span className="text-[12px] text-muted">{fmt(t.catalog.count, { n: counts[c] })}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {latest && latest.items.length > 0 && (
        <section className="flex flex-col gap-3">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-[17px] font-bold">{t.home.newProducts}</h2>
            <Link href={hrefWith({}, { view: "products" })} className="text-[13px] font-semibold text-accent hover:underline">
              {t.home.viewAll}
            </Link>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {latest.items.slice(0, 5).map((p) => (
              <ProductCard key={p.id} product={p} t={t} />
            ))}
          </div>
        </section>
      )}
    </>
  );
}

async function AllProducts({ sp, q, category, t }: { sp: Params; q?: string; category?: CategoryCode; t: Dictionary }) {
  const sort = sortOf(sp);
  const inStock = sp.stock === "1";
  const result = await listCatalog({ q, category, page: Number(sp.page) || 1, sort, inStock });
  const base: Params = { q, category, view: "products", sort: sort === "new" ? undefined : sort, stock: inStock ? "1" : undefined };
  return (
    <>
      <Header title={t.catalog.title} count={fmt(t.catalog.count, { n: result.total })}>
        <PageSearch hidden={{ view: "products", category }} q={q} placeholder={t.header.searchProducts} className="lg:hidden" />
      </Header>
      <ViewSwitch view="products" q={q} t={t} />
      <nav aria-label={t.catalog.title} className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0">
        {[undefined, ...CATEGORY_CODES].map((code) => {
          const active = code === category;
          return (
            <Link
              key={code ?? "all"}
              href={hrefWith(base, { category: code, page: undefined })}
              aria-current={active ? "page" : undefined}
              className={clsx(
                "h-9 shrink-0 rounded-lg border px-3.5 text-[13px] leading-[34px] font-medium whitespace-nowrap transition-colors",
                active ? "border-accent bg-accent text-accent-fg shadow-[var(--c-glow)]" : "border-line bg-[var(--c-glass-strong)] text-text hover:border-accent/40 hover:text-accent",
              )}
            >
              {code ? t.categories[code] : t.catalog.all}
            </Link>
          );
        })}
      </nav>
      <ProductGrid result={result} base={base} t={t} />
    </>
  );
}

async function SellerProducts({ sp, q, category, t }: { sp: Params; q?: string; category?: CategoryCode; t: Dictionary }) {
  const seller = sp.seller!;
  const sort = sortOf(sp);
  const inStock = sp.stock === "1";
  const [result, sellerName] = await Promise.all([listCatalog({ q, category, seller, page: Number(sp.page) || 1, sort, inStock }), getProductSeller(seller)]);
  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <Link href="/catalog" className="mb-1 inline-flex items-center gap-1 text-[13px] font-medium text-muted hover:text-accent">
            <ArrowLeft size={14} aria-hidden />
            {t.suppliers.back}
          </Link>
          <h1 className="text-2xl font-bold tracking-tight">{sellerName ?? t.catalog.title}</h1>
          <p className="mt-1 text-muted">
            {fmt(t.catalog.count, { n: result.total })}
            {sellerName && (
              <>
                {" · "}
                <Link href={`/suppliers/${seller}`} className="font-medium text-accent hover:underline">
                  {t.suppliers.page}
                </Link>
              </>
            )}
          </p>
        </div>
        <PageSearch hidden={{ seller, category }} q={q} placeholder={t.suppliers.searchIn} />
      </div>
      <ProductGrid result={result} base={{ q, category, seller, sort: sort === "new" ? undefined : sort, stock: inStock ? "1" : undefined }} t={t} />
    </>
  );
}

function ProductGrid({ result, base, t }: { result: Awaited<ReturnType<typeof listCatalog>>; base: Params; t: Dictionary }) {
  const { items, page, pages } = result;
  const sort = base.sort ?? "new";
  const chip = (active: boolean) =>
    clsx(
      "inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full border px-3.5 text-[13px] font-medium whitespace-nowrap transition-colors",
      active ? "border-accent bg-accent-soft text-accent" : "border-line bg-[var(--c-glass-strong)] text-text hover:border-accent/40 hover:text-accent",
    );
  return (
    <>
      {/* Saralash va "faqat mavjudlari" — sahifalash va kategoriya tanlovida saqlanadi. */}
      <div className="-mx-4 flex items-center gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0">
        <span className="shrink-0 text-[13px] text-muted">{t.catalog.sortLabel}:</span>
        {(
          [
            ["new", t.catalog.sortNew],
            ["cheap", t.catalog.sortCheap],
            ["expensive", t.catalog.sortExpensive],
          ] as const
        ).map(([key, label]) => (
          <Link key={key} href={hrefWith(base, { sort: key === "new" ? undefined : key, page: undefined })} aria-current={sort === key ? "true" : undefined} className={chip(sort === key)}>
            {label}
          </Link>
        ))}
        <Link href={hrefWith(base, { stock: base.stock ? undefined : "1", page: undefined })} aria-pressed={Boolean(base.stock)} className={clsx(chip(Boolean(base.stock)), "sm:ml-auto")}>
          <PackageCheck size={15} aria-hidden />
          {t.catalog.inStockOnly}
        </Link>
      </div>
      {items.length ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-[repeat(auto-fill,minmax(210px,1fr))] sm:gap-4">
          {items.map((p, i) => (
            // Birinchi qator rasmlari kechiktirilmaydi — sahifa tezroq "to'ladi" ko'rinadi.
            <ProductCard key={p.id} product={p} t={t} priority={i < 2} />
          ))}
        </div>
      ) : (
        <EmptyState Icon={PackageSearch} title={t.catalog.empty} hint={t.catalog.emptyHint} />
      )}
      {pages > 1 && (
        <nav className="flex items-center justify-center gap-3" aria-label="pagination">
          {page > 1 && (
            <Link href={hrefWith(base, { page: String(page - 1) })} className="rounded-lg border border-line bg-surface px-3.5 py-2 font-medium hover:bg-surface-2">
              {t.catalog.prev}
            </Link>
          )}
          <span className="text-muted">{fmt(t.catalog.page, { page, pages })}</span>
          {page < pages && (
            <Link href={hrefWith(base, { page: String(page + 1) })} className="rounded-lg border border-line bg-surface px-3.5 py-2 font-medium hover:bg-surface-2">
              {t.catalog.next}
            </Link>
          )}
        </nav>
      )}
    </>
  );
}
