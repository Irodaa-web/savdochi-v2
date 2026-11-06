import { BadgeCheck, Package } from "lucide-react";
import Link from "next/link";
import type { Dictionary } from "@/i18n/dictionaries/uz";
import { fmt } from "@/i18n/format";
import { formatAmount } from "@/lib/catalog";
import type { ProductView } from "@/server/products";

export function ProductCard({ product: p, t }: { product: ProductView; t: Dictionary }) {
  const unit = t.units[p.unit];
  const available = p.stock >= p.minOrder;
  return (
    <article className="flex flex-col overflow-hidden rounded-xl border border-line bg-surface">
      <Link href={`/catalog/${p.id}`} className="flex h-32 items-center justify-center bg-surface-2 text-muted/60" tabIndex={-1} aria-hidden>
        {p.images[0] ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={p.images[0]} alt="" loading="lazy" className="size-full object-cover" />
        ) : (
          <Package size={30} strokeWidth={1.4} />
        )}
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
