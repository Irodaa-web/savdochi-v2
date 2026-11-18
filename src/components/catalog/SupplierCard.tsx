import { BadgeCheck, ChevronRight, MapPin } from "lucide-react";
import Link from "next/link";
import type { Dictionary } from "@/i18n/dictionaries/uz";
import { fmt } from "@/i18n/format";
import type { SupplierView } from "@/server/products";

/** Nomidan bosh harflar: "Demo Oziq-ovqat MChJ" → "DO". */
function initials(name: string): string {
  const words = name.split(/[\s,]+/).filter((w) => /\p{L}/u.test(w));
  return words.slice(0, 2).map((w) => w[0]!.toUpperCase()).join("") || "?";
}

/** Kompaniya kartasi: butun karta bosiladi va shu kompaniya mahsulotlarini ochadi. */
export function SupplierCard({ supplier: s, t }: { supplier: SupplierView; t: Dictionary }) {
  return (
    <li className="group relative flex flex-col gap-4 rounded-2xl border border-line bg-surface p-5 shadow-[var(--c-shadow)] transition-all duration-200 hover:-translate-y-0.5 hover:border-accent/40 hover:shadow-[var(--c-shadow-lg)] focus-within:border-accent">
      <div className="flex items-start gap-3.5">
        <span className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-accent-soft text-[15px] font-bold text-accent">{initials(s.name)}</span>
        <div className="min-w-0 flex-1">
          <Link href={`/catalog?seller=${s.id}`} className="flex items-center gap-1.5 font-semibold outline-none after:absolute after:inset-0 after:rounded-2xl">
            <span className="truncate">{s.name}</span>
            {s.verified && <BadgeCheck size={16} className="shrink-0 text-accent" aria-label={t.catalog.verified} />}
          </Link>
          <span className="mt-1 flex items-center gap-1.5 text-[13px] text-muted">
            <MapPin size={14} aria-hidden />
            {t.regions[s.region]}
          </span>
        </div>
        <ChevronRight size={18} className="mt-1 shrink-0 text-muted transition-transform group-hover:translate-x-0.5" aria-hidden />
      </div>
      <div className="flex items-center justify-between gap-3 border-t border-line pt-4">
        <span className="text-[13px] text-muted">{fmt(t.suppliers.products, { n: s.productCount })}</span>
        <Link href={`/suppliers/${s.id}`} className="relative z-10 text-[13px] font-semibold text-muted hover:text-accent hover:underline">
          {t.suppliers.page}
        </Link>
      </div>
    </li>
  );
}
