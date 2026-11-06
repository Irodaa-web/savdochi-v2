import { BadgeCheck, MapPin, Truck } from "lucide-react";
import Link from "next/link";
import { EmptyState } from "@/components/ui/EmptyState";
import { fmt } from "@/i18n/format";
import { getDictionary, getLocale } from "@/i18n/server";
import { requireUser } from "@/lib/auth/guard";
import { REGION_CODES, type RegionCode } from "@/lib/regions";
import { listSuppliers } from "@/server/products";
import { RegionFilter } from "./RegionFilter";

export default async function SuppliersPage({ searchParams }: { searchParams: Promise<{ region?: string }> }) {
  await requireUser();
  const t = getDictionary(await getLocale());
  const raw = (await searchParams).region;
  const region = (REGION_CODES as readonly string[]).includes(raw ?? "") ? (raw as RegionCode) : undefined;
  const suppliers = await listSuppliers(region);

  return (
    <section className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold tracking-tight">{t.suppliers.title}</h1>
        <RegionFilter value={region ?? ""} />
      </div>

      {suppliers.length === 0 ? (
        <EmptyState Icon={Truck} title={t.suppliers.empty} />
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {suppliers.map((s) => (
            <li key={s.id} className="flex flex-col gap-2 rounded-xl border border-line bg-surface p-4">
              <span className="flex items-center gap-1.5 font-semibold">
                {s.name}
                {s.verified && <BadgeCheck size={16} className="text-accent" aria-label={t.catalog.verified} />}
              </span>
              <span className="flex items-center gap-1.5 text-[13px] text-muted">
                <MapPin size={14} aria-hidden />
                {t.regions[s.region]} · {fmt(t.suppliers.products, { n: s.productCount })}
              </span>
              <Link href={`/catalog?seller=${s.id}`} className="mt-1 text-[13px] font-semibold text-accent hover:underline">
                {t.suppliers.open}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
