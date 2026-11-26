import { BadgeCheck, CalendarDays, Clock, Flame, MapPin, Package, Star, Store, Truck, Wallet, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ProductCard } from "@/components/catalog/ProductCard";
import { StartChatButton } from "@/components/chat/StartChatButton";
import { ActionButton } from "@/components/ui/ActionButton";
import { Card, Pill } from "@/components/ui/Card";
import { fmt } from "@/i18n/format";
import { getDictionary, getLocale } from "@/i18n/server";
import { requireUser } from "@/lib/auth/guard";
import { formatAmount } from "@/lib/catalog";
import { termsForRegion } from "@/lib/delivery";
import { findPartnership } from "@/server/partners";
import { getSellerHighlights, type RankedProduct } from "@/server/products";
import { getSellerPublic } from "@/server/profile";
import { sellerReviews } from "@/server/reviews";
import { ReviewsSection } from "@/components/reviews/ReviewsSection";
import { Stars } from "@/components/reviews/Stars";
import type { Dictionary } from "@/i18n/dictionaries/uz";
import { PremiumBadge } from "@/components/catalog/PremiumBadge";
import { BrandImage } from "@/components/catalog/BrandImage";

/** Kompaniya sahifasi: kim, qayerga, qanday shartlarda yetkazadi. */
export default async function SupplierPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const locale = await getLocale();
  const t = getDictionary(locale);
  const id = (await params).id;
  // So'rovlar parallel — bazaga bir "aylanish".
  const [s, partnership, highlights, reviews] = await Promise.all([
    getSellerPublic(id, user),
    user.role === "buyer" ? findPartnership(id, user.id) : null,
    getSellerHighlights(id),
    sellerReviews(id),
  ]);
  if (!s) notFound();
  const p = s.profile;
  const hasStats = highlights.bestSelling.length > 0 || highlights.popular.length > 0;

  const rows: [typeof Truck, string, string][] = [
    [MapPin, t.profile.deliveryRegions, p.deliveryRegions.length ? p.deliveryRegions.map((r) => t.regions[r]).join(", ") : t.regions[s.region]],
    [CalendarDays, t.profile.deliveryDays, p.deliveryDays.map((d) => t.weekdays[d - 1]).join(", ") || "—"],
    [Clock, t.profile.leadDays, fmt(t.supplierPage.leadDays, { n: p.leadDays })],
    [Truck, t.profile.deliveryFee, p.deliveryFee ? `${formatAmount(p.deliveryFee)} ${t.common.sum}` : t.supplierPage.free],
    [Package, t.profile.minOrderTotal, p.minOrderTotal ? `${formatAmount(p.minOrderTotal)} ${t.common.sum}` : "—"],
    [Wallet, t.profile.paymentMethods, p.paymentMethods.map((m) => t.payment[m]).join(", ")],
    ...(p.pickup ? ([[Store, t.supplierPage.pickup, t.supplierPage.pickupYes]] as [typeof Truck, string, string][]) : []),
  ];

  return (
    <section className="flex flex-col gap-5">
      <div className={`hero relative isolate flex flex-col gap-3 overflow-hidden rounded-2xl px-6 py-7 shadow-[var(--c-shadow-lg)] ${s.banner ? "min-h-56 justify-end" : ""}`}>
        {s.banner ? (
          <>
            {/* Kompaniya banneri: matn o'qilishi uchun pastdan quyuq soya. */}
            <span aria-hidden className="absolute inset-0 -z-10">
              <BrandImage src={s.banner} sizes="(min-width: 1280px) 1100px, 100vw" priority className="object-cover" />
            </span>
            <span aria-hidden className="absolute inset-0 -z-10 bg-gradient-to-t from-black/75 via-black/40 to-black/10" />
          </>
        ) : (
          <>
            <span aria-hidden className="orb -top-12 right-8 size-36" />
            <span aria-hidden className="orb right-44 -bottom-14 size-24 [animation-delay:-4s]" />
          </>
        )}
        {s.logo && (
          <span className="relative size-16 overflow-hidden rounded-2xl bg-white shadow-lg ring-2 ring-white/70">
            <BrandImage src={s.logo} alt={s.name} sizes="64px" className="object-cover" />
          </span>
        )}
        <span className="text-[12px] font-semibold tracking-wider text-header-muted uppercase">
          {t.roles.seller} · {t.regions[s.region]}
        </span>
        <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
          {s.name}
          {s.verified && <BadgeCheck size={20} className="text-sky-300" aria-label={t.catalog.verified} />}
          {s.premium && <PremiumBadge label={t.plans.names.premium} onDark />}
        </h1>
        {reviews.rating.count > 0 && (
          <a href="#reviews" className="flex w-fit items-center gap-2 rounded-full bg-white/12 px-3 py-1 text-[13px] text-white backdrop-blur-sm hover:bg-white/20">
            <Stars value={reviews.rating.average} size={14} />
            <b className="tabular-nums">{reviews.rating.average.toFixed(1)}</b>
            <span className="text-header-muted">· {fmt(t.reviews.count, { n: reviews.rating.count })}</span>
          </a>
        )}
        {p.about && <p className="max-w-2xl text-header-muted">{p.about}</p>}
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
        <Card>
          <h2 className="mb-3 font-semibold">{t.supplierPage.terms}</h2>
          <dl className="grid gap-3">
            {rows.map(([Icon, label, value]) => (
              <div key={label} className="flex gap-3">
                <Icon size={18} className="mt-0.5 shrink-0 text-muted" aria-hidden />
                <div>
                  <dt className="text-[13px] text-muted">{label}</dt>
                  <dd className="font-medium">{value}</dd>
                </div>
              </div>
            ))}
          </dl>
        </Card>

        <Card className="flex flex-col gap-3">
          <Link href={`/catalog?seller=${s.id}`} className="font-semibold text-accent hover:underline">
            {fmt(t.suppliers.products, { n: s.productCount })} →
          </Link>
          {user.role === "buyer" && !user.isAdmin && (
            <>
              {partnership?.status === "active" ? (
                <div className="flex flex-col gap-1">
                  <Pill tone="success">{t.partners.status.active}</Pill>
                  {partnership.discount > 0 && <span className="text-[13px] text-muted">{fmt(t.partners.discountNote, { n: partnership.discount })}</span>}
                </div>
              ) : partnership?.status === "pending" ? (
                <Pill tone="accent">{partnership.requestedBy === "buyer" ? t.partners.requestSent : t.partners.requestIncoming}</Pill>
              ) : (
                <ActionButton path="/api/v1/partnerships" body={{ partnerId: s.id }}>
                  {t.partners.request}
                </ActionButton>
              )}
              <StartChatButton partnerId={s.id} />
            </>
          )}
        </Card>
      </div>

      {(p.regionRules ?? []).length > 0 && (
        <Card className="p-0">
          <h2 className="flex items-center gap-2 px-5 pt-4 pb-3 font-semibold">
            <CalendarDays size={17} className="text-accent" aria-hidden />
            {t.delivery.scheduleTitle}
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[520px] border-collapse text-left text-[14px]">
              <thead>
                <tr className="border-y border-line text-[13px] text-muted">
                  <th className="px-5 py-2.5 font-medium">{t.delivery.colRegion}</th>
                  <th className="px-3 py-2.5 font-medium">{t.delivery.colDays}</th>
                  <th className="px-3 py-2.5 text-right font-medium">{t.delivery.colFee}</th>
                  <th className="px-5 py-2.5 text-right font-medium">{t.delivery.colMin}</th>
                </tr>
              </thead>
              <tbody>
                {p.regionRules.map((r) => {
                  const local = termsForRegion(p, r.region);
                  const mine = user.role === "buyer" && user.region === r.region;
                  return (
                    <tr key={r.region} className={mine ? "border-b border-line bg-accent-soft/60 last:border-0" : "border-b border-line last:border-0"}>
                      <td className="px-5 py-2.5 font-medium">
                        {t.regions[r.region]}
                        {mine && <span className="ml-1.5 text-[12px] font-normal text-accent">· {t.delivery.yourRegion}</span>}
                      </td>
                      <td className="px-3 py-2.5">{local.days.map((d) => t.weekdays[d - 1]).join(", ")}</td>
                      <td className="px-3 py-2.5 text-right tabular-nums">{local.fee ? formatAmount(local.fee) : t.supplierPage.free}</td>
                      <td className="px-5 py-2.5 text-right tabular-nums">{local.minOrderTotal ? formatAmount(local.minOrderTotal) : "—"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {hasStats ? (
        <>
          <Highlight
            Icon={Flame}
            title={t.supplierPage.bestSelling}
            hint={t.supplierPage.bestSellingHint}
            items={highlights.bestSelling}
            note={(r) => fmt(t.supplierPage.sold, { n: formatAmount(r.value), unit: t.units[r.product.unit] })}
            t={t}
          />
          <Highlight
            Icon={Star}
            title={t.supplierPage.popular}
            hint={t.supplierPage.popularHint}
            items={highlights.popular}
            note={(r) => fmt(t.supplierPage.shops, { n: r.value })}
            t={t}
          />
          {s.productCount > 0 && (
            <Link href={`/catalog?seller=${s.id}`} className="self-center rounded-lg border border-line bg-surface px-4 py-2 font-semibold hover:bg-surface-2">
              {t.supplierPage.all} ({s.productCount}) →
            </Link>
          )}
        </>
      ) : (
        s.productCount > 0 && <p className="rounded-xl border border-dashed border-line px-4 py-3 text-[13px] text-muted">{t.supplierPage.noStats}</p>
      )}

      <ReviewsSection data={reviews} owner={user.id === s.id} locale={locale} t={t} />
    </section>
  );
}

/** Kompaniya sahifasidagi mahsulotlar bo'limi (eng ko'p sotilgan / eng mashhur). Bo'sh bo'lsa ko'rinmaydi. */
function Highlight({
  Icon,
  title,
  hint,
  items,
  note,
  t,
}: {
  Icon: LucideIcon;
  title: string;
  hint: string;
  items: RankedProduct[];
  note: (r: RankedProduct) => string;
  t: Dictionary;
}) {
  if (!items.length) return null;
  return (
    <section className="flex flex-col gap-3">
      <div>
        <h2 className="flex items-center gap-2 text-lg font-bold tracking-tight">
          <Icon size={18} className="text-accent" aria-hidden />
          {title}
        </h2>
        <p className="text-[13px] text-muted">{hint}</p>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-[repeat(auto-fill,minmax(210px,1fr))] sm:gap-4">
        {items.map((r) => (
          <ProductCard key={r.product.id} product={r.product} t={t} note={note(r)} />
        ))}
      </div>
    </section>
  );
}
