import { BadgeCheck, CalendarDays, Clock, MapPin, Package, Truck, Wallet } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { StartChatButton } from "@/components/chat/StartChatButton";
import { ActionButton } from "@/components/ui/ActionButton";
import { Card, Pill } from "@/components/ui/Card";
import { fmt } from "@/i18n/format";
import { getDictionary, getLocale } from "@/i18n/server";
import { requireUser } from "@/lib/auth/guard";
import { formatAmount } from "@/lib/catalog";
import { findPartnership } from "@/server/partners";
import { getSellerPublic } from "@/server/profile";

/** Kompaniya sahifasi: kim, qayerga, qanday shartlarda yetkazadi. */
export default async function SupplierPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const t = getDictionary(await getLocale());
  const s = await getSellerPublic((await params).id);
  if (!s) notFound();
  const p = s.profile;
  const partnership = user.role === "buyer" ? await findPartnership(s.id, user.id) : null;

  const rows: [typeof Truck, string, string][] = [
    [MapPin, t.profile.deliveryRegions, p.deliveryRegions.length ? p.deliveryRegions.map((r) => t.regions[r]).join(", ") : t.regions[s.region]],
    [CalendarDays, t.profile.deliveryDays, p.deliveryDays.map((d) => t.weekdays[d - 1]).join(", ") || "—"],
    [Clock, t.profile.leadDays, fmt(t.supplierPage.leadDays, { n: p.leadDays })],
    [Truck, t.profile.deliveryFee, p.deliveryFee ? `${formatAmount(p.deliveryFee)} ${t.common.sum}` : t.supplierPage.free],
    [Package, t.profile.minOrderTotal, p.minOrderTotal ? `${formatAmount(p.minOrderTotal)} ${t.common.sum}` : "—"],
    [Wallet, t.profile.paymentMethods, p.paymentMethods.map((m) => t.payment[m]).join(", ")],
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
    </section>
  );
}
