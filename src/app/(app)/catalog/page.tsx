import clsx from "clsx";
import { ArrowLeft, Building2, Package, PackageSearch, Search, ShieldAlert } from "lucide-react";
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
import { getProductSeller, listCatalog, listSuppliers } from "@/server/products";

type Params = { q?: string; category?: string; seller?: string; page?: string; view?: string; region?: string };

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
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
        <p className="mt-1 text-muted">{count}</p>
      </div>
      {children}
    </div>
  );
}

async function Companies({ sp, q, t }: { sp: Params; q?: string; t: Dictionary }) {
  const region = (REGION_CODES as readonly string[]).includes(sp.region ?? "") ? (sp.region as RegionCode) : undefined;
  const suppliers = await listSuppliers({ region, q });
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
    </>
  );
}

async function AllProducts({ sp, q, category, t }: { sp: Params; q?: string; category?: CategoryCode; t: Dictionary }) {
  const result = await listCatalog({ q, category, page: Number(sp.page) || 1 });
  const base: Params = { q, category, view: "products" };
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
                active ? "border-header bg-header text-header-text" : "border-line bg-surface text-text hover:bg-surface-2",
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
  const [result, sellerName] = await Promise.all([listCatalog({ q, category, seller, page: Number(sp.page) || 1 }), getProductSeller(seller)]);
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
      <ProductGrid result={result} base={{ q, category, seller }} t={t} />
    </>
  );
}

function ProductGrid({ result, base, t }: { result: Awaited<ReturnType<typeof listCatalog>>; base: Params; t: Dictionary }) {
  const { items, page, pages } = result;
  return (
    <>
      {items.length ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-[repeat(auto-fill,minmax(210px,1fr))] sm:gap-4">
          {items.map((p) => (
            <ProductCard key={p.id} product={p} t={t} />
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
