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
import { findPartnership } from "@/server/partners";
import { getSellerHighlights, type RankedProduct } from "@/server/products";
import { getSellerPublic } from "@/server/profile";
import type { Dictionary } from "@/i18n/dictionaries/uz";

/** Kompaniya sahifasi: kim, qayerga, qanday shartlarda yetkazadi. */
export default async function SupplierPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const t = getDictionary(await getLocale());
  const id = (await params).id;
  // Uchala so'rov parallel — bazaga bir "aylanish".
  const [s, partnership, highlights] = await Promise.all([getSellerPublic(id), user.role === "buyer" ? findPartnership(id, user.id) : null, getSellerHighlights(id)]);
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
      <div className="flex flex-col gap-3 rounded-xl bg-header px-6 py-6 text-header-text">
        <span className="text-[12px] font-semibold tracking-wider text-header-muted uppercase">
          {t.roles.seller} · {t.regions[s.region]}
        </span>
        <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
          {s.name}
          {s.verified && <BadgeCheck size={20} className="text-accent" aria-label={t.catalog.verified} />}
        </h1>
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
          {user.role === "buyer" && (
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
