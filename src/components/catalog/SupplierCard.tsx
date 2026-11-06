import { BadgeCheck, Building2, ChevronRight, MapPin } from "lucide-react";
import Link from "next/link";
import type { Dictionary } from "@/i18n/dictionaries/uz";
import { fmt } from "@/i18n/format";
import type { SupplierView } from "@/server/products";

/** Kompaniya kartasi: butun karta bosiladi va shu kompaniya mahsulotlarini ochadi. */
export function SupplierCard({ supplier: s, t }: { supplier: SupplierView; t: Dictionary }) {
  return (
    <li className="relative flex flex-col gap-2 rounded-xl border border-line bg-surface p-4 transition-colors focus-within:border-accent hover:border-accent hover:bg-surface-2">
      <Link href={`/catalog?seller=${s.id}`} className="flex items-center gap-2 font-semibold outline-none after:absolute after:inset-0 after:rounded-xl">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-surface-2 text-muted">
          <Building2 size={18} aria-hidden />
        </span>
        <span className="min-w-0">{s.name}</span>
        {s.verified && <BadgeCheck size={16} className="shrink-0 text-accent" aria-label={t.catalog.verified} />}
        <ChevronRight size={16} className="ml-auto shrink-0 text-muted" aria-hidden />
      </Link>
      <span className="flex items-center gap-1.5 text-[13px] text-muted">
        <MapPin size={14} aria-hidden />
        {t.regions[s.region]} · {fmt(t.suppliers.products, { n: s.productCount })}
      </span>
      <div className="mt-1 flex gap-4">
        <span className="text-[13px] font-semibold text-accent">{t.suppliers.open}</span>
        <Link href={`/suppliers/${s.id}`} className="relative z-10 text-[13px] font-semibold text-muted hover:text-accent hover:underline">
          {t.suppliers.page}
        </Link>
      </div>
    </li>
  );
}
