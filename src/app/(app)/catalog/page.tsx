import clsx from "clsx";
import { ArrowLeft, PackageSearch, Search, ShieldAlert } from "lucide-react";
import Link from "next/link";
import { ProductCard } from "@/components/catalog/ProductCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { fmt } from "@/i18n/format";
import { getDictionary, getLocale } from "@/i18n/server";
import { requireUser } from "@/lib/auth/guard";
import { CATEGORY_CODES, type CategoryCode } from "@/lib/catalog";
import { getProductSeller, listCatalog } from "@/server/products";

type Params = { q?: string; category?: string; seller?: string; page?: string };

function hrefWith(current: Params, patch: Partial<Params>): string {
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries({ ...current, ...patch })) if (v) params.set(k, v);
  const s = params.toString();
  return s ? `/catalog?${s}` : "/catalog";
}

export default async function CatalogPage({ searchParams }: { searchParams: Promise<Params> }) {
  const user = await requireUser();
  const t = getDictionary(await getLocale());
  const sp = await searchParams;
  const category = (CATEGORY_CODES as readonly string[]).includes(sp.category ?? "") ? (sp.category as CategoryCode) : undefined;
  const { items, total, page, pages } = await listCatalog({ q: sp.q, category, seller: sp.seller, page: Number(sp.page) || 1 });
  const sellerName = sp.seller ? await getProductSeller(sp.seller) : null;

  return (
    <section className="flex flex-col gap-5">
      {user.role === "buyer" && user.verification !== "verified" && (
        <div className="flex items-start gap-3 rounded-xl border border-line bg-accent-soft px-4 py-3">
          <ShieldAlert size={18} className="mt-0.5 shrink-0 text-accent" aria-hidden />
          <p className="text-[13px] leading-relaxed">{t.home.verifyNote}</p>
        </div>
      )}

      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          {sellerName && (
            <Link href="/suppliers" className="mb-1 inline-flex items-center gap-1 text-[13px] font-medium text-muted hover:text-accent">
              <ArrowLeft size={14} aria-hidden />
              {t.suppliers.back}
            </Link>
          )}
          <h1 className="text-2xl font-bold tracking-tight">{sellerName ?? t.catalog.title}</h1>
          <p className="mt-1 text-muted">
            {fmt(t.catalog.count, { n: total })}
            {sellerName && (
              <>
                {" · "}
                <Link href={`/suppliers/${sp.seller}`} className="font-medium text-accent hover:underline">
                  {t.suppliers.page}
                </Link>
              </>
            )}
          </p>
        </div>
        {/* Kompaniya ichida — uning mahsulotlarini qidirish; aks holda — kompaniyalarni qidirish. */}
        <form action={sellerName ? "/catalog" : "/suppliers"} className={clsx("w-full sm:w-80", !sellerName && "lg:hidden")} role="search">
          {sellerName && <input type="hidden" name="seller" value={sp.seller} />}
          {sellerName && category && <input type="hidden" name="category" value={category} />}
          <label className="flex h-10 items-center gap-2 rounded-lg border border-line bg-surface px-3 text-muted focus-within:border-accent">
            <Search size={16} aria-hidden />
            <input
              type="search"
              name="q"
              defaultValue={sellerName ? sp.q : undefined}
              placeholder={sellerName ? t.suppliers.searchIn : t.header.search}
              aria-label={sellerName ? t.suppliers.searchIn : t.header.search}
              className="min-w-0 flex-1 bg-transparent text-text outline-none"
            />
          </label>
        </form>
      </div>

      <nav aria-label={t.catalog.title} className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0">
        {[undefined, ...CATEGORY_CODES].map((code) => {
          const active = code === category;
          return (
            <Link
              key={code ?? "all"}
              href={hrefWith(sp, { category: code, page: undefined })}
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
            <Link href={hrefWith(sp, { page: String(page - 1) })} className="rounded-lg border border-line bg-surface px-3.5 py-2 font-medium hover:bg-surface-2">
              {t.catalog.prev}
            </Link>
          )}
          <span className="text-muted">{fmt(t.catalog.page, { page, pages })}</span>
          {page < pages && (
            <Link href={hrefWith(sp, { page: String(page + 1) })} className="rounded-lg border border-line bg-surface px-3.5 py-2 font-medium hover:bg-surface-2">
              {t.catalog.next}
            </Link>
          )}
        </nav>
      )}
    </section>
  );
}
