import { BadgeCheck } from "lucide-react";
import Link from "next/link";
import { ProductImage } from "@/components/catalog/ProductImage";
import type { Dictionary } from "@/i18n/dictionaries/uz";
import { fmt } from "@/i18n/format";
import { formatAmount, saleDay } from "@/lib/catalog";
import type { ProductView } from "@/server/products";

/** note — kartaning tepasida ko'rsatiladigan qisqa belgi (masalan, "120 dona sotilgan"). */
export function ProductCard({ product: p, t, note, priority = false }: { product: ProductView; t: Dictionary; note?: string; priority?: boolean }) {
  const unit = t.units[p.unit];
  const available = p.stock >= p.minOrder;
  return (
    <article className="glass-card sheen group relative flex flex-col rounded-2xl transition-all duration-300 hover:-translate-y-1 hover:border-accent/40 hover:shadow-[var(--c-shadow-lg)]">
      {note && (
        <span className="absolute top-2 left-2 z-10 rounded-md bg-accent px-2 py-0.5 text-[11px] font-semibold text-accent-fg">{note}</span>
      )}
      {p.sale && (
        <span className="absolute top-2 right-2 z-10 rounded-md bg-danger px-1.5 py-0.5 text-[12px] font-bold text-white shadow-sm">
          −{p.sale.percent}%
        </span>
      )}
      <Link href={`/catalog/${p.id}`} className="block h-32 overflow-hidden" tabIndex={-1} aria-hidden>
        <ProductImage src={p.images[0]} name={p.name} category={p.category} priority={priority} className="h-32 w-full transition-transform duration-500 group-hover:scale-[1.04]" />
      </Link>
      <div className="flex flex-1 flex-col gap-1.5 p-3.5">
        <span className="text-[12px] text-muted">{t.categories[p.category]}</span>
        <Link href={`/catalog/${p.id}`} className="leading-snug font-semibold hover:text-accent">
          {p.name}
        </Link>
        <span className="flex items-center gap-1 text-[12px] text-muted">
          {p.seller.name}
          {p.seller.verified && <BadgeCheck size={14} className="text-accent" aria-label={t.catalog.verified} />}
        </span>
        <div className="mt-auto pt-2">
          {p.sale && (
            <span className="block text-[12px] text-muted">
              <s aria-label={t.catalog.oldPrice}>{formatAmount(p.price)}</s> · {fmt(t.catalog.saleUntil, { date: saleDay(p.sale.until) })}
            </span>
          )}
          <span className={p.sale ? "text-[17px] font-bold text-danger" : "text-[17px] font-bold"}>{formatAmount(p.sale?.price ?? p.price)}</span>{" "}
          <span className="text-[12px] text-muted">{fmt(t.catalog.perUnit, { unit })}</span>
        </div>
        <span className={available ? "text-[12px] text-muted" : "text-[12px] font-medium text-danger"}>
          {available ? fmt(t.catalog.minOrder, { n: p.minOrder, unit }) : t.catalog.outOfStock}
        </span>
      </div>
    </article>
  );
}
