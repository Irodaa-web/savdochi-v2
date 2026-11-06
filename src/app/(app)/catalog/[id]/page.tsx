import { ArrowLeft, BadgeCheck, MapPin } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { fmt } from "@/i18n/format";
import { getDictionary, getLocale } from "@/i18n/server";
import { requireUser } from "@/lib/auth/guard";
import { formatAmount } from "@/lib/catalog";
import { BuyBox } from "@/components/catalog/BuyBox";
import { ProductGallery } from "@/components/catalog/ProductGallery";
import { StartChatButton } from "@/components/chat/StartChatButton";
import { getProduct, isFavorite } from "@/server/products";

export default async function ProductPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const t = getDictionary(await getLocale());
  const p = await getProduct((await params).id);
  if (!p || !p.active) notFound();
  const unit = t.units[p.unit];

  return (
    <article className="flex flex-col gap-5">
      <Link href="/catalog" className="inline-flex w-fit items-center gap-1.5 text-muted hover:text-text">
        <ArrowLeft size={16} aria-hidden />
        {t.catalog.back}
      </Link>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
        <div className="flex flex-col gap-5">
          <ProductGallery images={p.images} name={p.name} />
          {p.description && <p className="leading-relaxed whitespace-pre-line">{p.description}</p>}
        </div>

        <aside className="flex flex-col gap-4">
          <div className="flex flex-col gap-3 rounded-xl border border-line bg-surface p-5">
            <span className="text-[13px] text-muted">{t.categories[p.category]}</span>
            <h1 className="text-xl leading-snug font-bold">{p.name}</h1>
            <div>
              <span className="text-2xl font-bold">{formatAmount(p.price)}</span> <span className="text-muted">{fmt(t.catalog.perUnit, { unit })}</span>
            </div>
            <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-[13px]">
              <dt className="text-muted">{t.products.minOrder}</dt>
              <dd>
                {p.minOrder} {unit}
              </dd>
              <dt className="text-muted">{t.products.stock}</dt>
              <dd className={p.stock < p.minOrder ? "font-medium text-danger" : undefined}>
                {p.stock < p.minOrder ? t.catalog.outOfStock : `${p.stock} ${unit}`}
              </dd>
              {p.packSize > 1 && (
                <>
                  <dt className="text-muted">{t.products.packSize}</dt>
                  <dd>{fmt(t.catalog.packSize, { n: p.packSize, unit })}</dd>
                </>
              )}
            </dl>

            {p.priceTiers.length > 0 && (
              <div className="rounded-lg bg-surface-2 p-3">
                <p className="mb-2 text-[13px] font-semibold">{t.catalog.tiersTitle}</p>
                <ul className="flex flex-col gap-1 text-[13px]">
                  {p.priceTiers.map((tier) => (
                    <li key={tier.min} className="flex justify-between gap-3">
                      <span className="text-muted">{fmt(t.catalog.tierRow, { n: tier.min, unit })}</span>
                      <span className="font-semibold tabular-nums">{formatAmount(tier.price)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {user.role === "buyer" && (
              <BuyBox productId={p.id} price={p.price} tiers={p.priceTiers} minOrder={p.minOrder} stock={p.stock} unit={unit} saved={await isFavorite(user.id, p.id)} />
            )}
          </div>

          <div className="flex flex-col gap-2 rounded-xl border border-line bg-surface p-5">
            <span className="text-[12px] font-semibold tracking-wider text-muted uppercase">{t.catalog.seller}</span>
            <span className="flex items-center gap-1.5 font-semibold">
              {p.seller.name}
              {p.seller.verified && <BadgeCheck size={16} className="text-accent" aria-label={t.catalog.verified} />}
            </span>
            <span className="flex items-center gap-1.5 text-[13px] text-muted">
              <MapPin size={14} aria-hidden />
              {t.regions[p.seller.region]}
            </span>
            <Link href={`/suppliers/${p.seller.id}`} className="mt-1 text-[13px] font-semibold text-accent hover:underline">
              {t.suppliers.page}
            </Link>
            <Link href={`/catalog?seller=${p.seller.id}`} className="text-[13px] font-semibold text-accent hover:underline">
              {t.catalog.sellerProducts}
            </Link>
            {user.role === "buyer" && <StartChatButton partnerId={p.seller.id} className="mt-2" />}
          </div>
        </aside>
      </div>
    </article>
  );
}
