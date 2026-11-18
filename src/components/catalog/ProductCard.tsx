import { BadgeCheck } from "lucide-react";
import Link from "next/link";
import { ProductImage } from "@/components/catalog/ProductImage";
import type { Dictionary } from "@/i18n/dictionaries/uz";
import { fmt } from "@/i18n/format";
import { formatAmount } from "@/lib/catalog";
import type { ProductView } from "@/server/products";

/** note — kartaning tepasida ko'rsatiladigan qisqa belgi (masalan, "120 dona sotilgan"). */
export function ProductCard({ product: p, t, note }: { product: ProductView; t: Dictionary; note?: string }) {
  const unit = t.units[p.unit];
  const available = p.stock >= p.minOrder;
  return (
    <article className="relative flex flex-col overflow-hidden rounded-2xl border border-line bg-surface shadow-[var(--c-shadow)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[var(--c-shadow-lg)]">
      {note && (
        <span className="absolute top-2 left-2 z-10 rounded-md bg-accent px-2 py-0.5 text-[11px] font-semibold text-accent-fg">{note}</span>
      )}
      <Link href={`/catalog/${p.id}`} className="block h-32" tabIndex={-1} aria-hidden>
        <ProductImage src={p.images[0]} name={p.name} category={p.category} className="h-32 w-full" />
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
          <span className="text-[17px] font-bold">{formatAmount(p.price)}</span>{" "}
          <span className="text-[12px] text-muted">{fmt(t.catalog.perUnit, { unit })}</span>
        </div>
        <span className={available ? "text-[12px] text-muted" : "text-[12px] font-medium text-danger"}>
          {available ? fmt(t.catalog.minOrder, { n: p.minOrder, unit }) : t.catalog.outOfStock}
        </span>
      </div>
    </article>
  );
}
