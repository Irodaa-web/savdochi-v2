import { BadgeCheck, ChevronRight, MapPin } from "lucide-react";
import Link from "next/link";
import type { Dictionary } from "@/i18n/dictionaries/uz";
import { fmt } from "@/i18n/format";
import type { SupplierView } from "@/server/products";
import { RatingBadge } from "@/components/reviews/Stars";
import { BrandImage, coverFor, initials } from "./BrandImage";
import { PremiumBadge } from "./PremiumBadge";

/**
 * Kompaniya kartasi: tepada banner (yo'q bo'lsa — kompaniyaning o'z rangidagi fon), ustida logotip.
 * Butun karta bosiladi va shu kompaniya mahsulotlarini ochadi.
 */
export function SupplierCard({ supplier: s, t }: { supplier: SupplierView; t: Dictionary }) {
  return (
    <li className="glass-card group relative flex flex-col overflow-hidden rounded-2xl transition-all duration-300 hover:-translate-y-1 hover:border-accent/40 hover:shadow-[var(--c-shadow-lg)] focus-within:border-accent">
      <div className={`relative h-24 overflow-hidden bg-gradient-to-br ${coverFor(s.name)}`}>
        {s.banner ? (
          <BrandImage src={s.banner} sizes="(min-width: 1024px) 400px, 100vw" className="object-cover transition-transform duration-500 group-hover:scale-[1.04]" />
        ) : (
          <span aria-hidden className="absolute inset-0 bg-[radial-gradient(circle_at_85%_20%,rgba(255,255,255,0.28),transparent_45%),radial-gradient(circle_at_10%_110%,rgba(255,255,255,0.18),transparent_40%)]" />
        )}
        {s.premium && (
          <span className="absolute top-2.5 right-2.5">
            <PremiumBadge label={t.plans.names.premium} onDark />
          </span>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-3 px-5 pb-5">
        <div className="-mt-7 flex items-end gap-3">
          <span className="relative flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-surface text-[16px] font-bold text-accent shadow-[var(--c-shadow-lg)] ring-4 ring-[var(--c-glass-strong)]">
            {s.logo ? <BrandImage src={s.logo} alt="" sizes="56px" className="object-cover" /> : initials(s.name)}
          </span>
          <ChevronRight size={18} className="mb-1 ml-auto shrink-0 text-muted transition-transform group-hover:translate-x-0.5" aria-hidden />
        </div>
        <div className="min-w-0">
          <Link href={`/catalog?seller=${s.id}`} className="flex items-center gap-1.5 font-semibold outline-none after:absolute after:inset-0 after:rounded-2xl">
            <span className="truncate">{s.name}</span>
            {s.verified && <BadgeCheck size={16} className="shrink-0 text-accent" aria-label={t.catalog.verified} />}
          </Link>
          <span className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px] text-muted">
            <span className="flex items-center gap-1.5">
              <MapPin size={14} aria-hidden />
              {t.regions[s.region]}
            </span>
            {s.rating.count > 0 && <RatingBadge average={s.rating.average} count={s.rating.count} t={t} />}
          </span>
        </div>
        <div className="mt-auto flex items-center justify-between gap-3 border-t border-line pt-3">
          <span className="text-[13px] text-muted">{fmt(t.suppliers.products, { n: s.productCount })}</span>
          <Link href={`/suppliers/${s.id}`} className="relative z-10 text-[13px] font-semibold text-muted hover:text-accent hover:underline">
            {t.suppliers.page}
          </Link>
        </div>
      </div>
    </li>
  );
}
