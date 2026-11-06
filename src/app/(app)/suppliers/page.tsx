import { Search, Truck } from "lucide-react";
import { RegionFilter } from "@/components/catalog/RegionFilter";
import { SupplierCard } from "@/components/catalog/SupplierCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { fmt } from "@/i18n/format";
import { getDictionary, getLocale } from "@/i18n/server";
import { requireUser } from "@/lib/auth/guard";
import { REGION_CODES, type RegionCode } from "@/lib/regions";
import { listSuppliers } from "@/server/products";

/** Kompaniyalar qidiruvi. Kartani bosish — shu kompaniya mahsulotlari. */
export default async function SuppliersPage({ searchParams }: { searchParams: Promise<{ region?: string; q?: string }> }) {
  await requireUser();
  const t = getDictionary(await getLocale());
  const sp = await searchParams;
  const region = (REGION_CODES as readonly string[]).includes(sp.region ?? "") ? (sp.region as RegionCode) : undefined;
  const q = sp.q?.trim() || undefined;
  const suppliers = await listSuppliers({ region, q });

  return (
    <section className="flex flex-col gap-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{q ? fmt(t.suppliers.resultsFor, { q }) : t.suppliers.title}</h1>
          <p className="mt-1 text-muted">{fmt(t.suppliers.count, { n: suppliers.length })}</p>
        </div>
        <div className="flex w-full flex-wrap gap-2 sm:w-auto">
          <form action="/suppliers" role="search" className="min-w-0 flex-1 sm:w-80 sm:flex-none">
            {region && <input type="hidden" name="region" value={region} />}
            <label className="flex h-10 items-center gap-2 rounded-lg border border-line bg-surface px-3 text-muted focus-within:border-accent">
              <Search size={16} aria-hidden />
              <input
                type="search"
                name="q"
                defaultValue={q}
                placeholder={t.header.search}
                aria-label={t.header.search}
                className="min-w-0 flex-1 bg-transparent text-text outline-none"
              />
            </label>
          </form>
          <RegionFilter value={region ?? ""} q={q} />
        </div>
      </div>

      {suppliers.length === 0 ? (
        <EmptyState Icon={Truck} title={q ? t.suppliers.notFound : t.suppliers.empty} hint={q ? t.suppliers.notFoundHint : undefined} />
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {suppliers.map((s) => (
            <SupplierCard key={s.id} supplier={s} t={t} />
          ))}
        </ul>
      )}
    </section>
  );
}
