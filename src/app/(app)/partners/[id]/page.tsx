import { ArrowLeft, Lock, MapPin, Warehouse } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { StartChatButton } from "@/components/chat/StartChatButton";
import { PaymentPill, StatusPill } from "@/components/orders/StatusPill";
import { ActionButton } from "@/components/ui/ActionButton";
import { Card, Pill } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { fmt, formatDateTime } from "@/i18n/format";
import { getDictionary, getLocale } from "@/i18n/server";
import { requireUser } from "@/lib/auth/guard";
import { formatAmount } from "@/lib/catalog";
import { listOrders } from "@/server/orders";
import { findPartnership } from "@/server/partners";
import { getProfile } from "@/server/profile";
import { partnerStock } from "@/server/stock";

/** Kompaniya uchun hamkor do'kon sahifasi: ombordagi qoldiq va buyurtmalar tarixi. */
export default async function PartnerPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser("seller");
  const locale = await getLocale();
  const t = getDictionary(locale);
  const id = (await params).id;
  const buyer = await getProfile(id);
  if (!buyer || buyer.role !== "buyer") notFound();
  const [partnership, stock, orders] = await Promise.all([findPartnership(user.id, id), partnerStock(user.id, id), listOrders(user, { partnerId: id, limit: 20 })]);
  const units = t.units as Record<string, string>;
  const low = stock?.filter((s) => s.low) ?? [];

  return (
    <article className="flex flex-col gap-5">
      <Link href="/partners" className="inline-flex w-fit items-center gap-1.5 text-muted hover:text-text">
        <ArrowLeft size={16} aria-hidden />
        {t.header.myPartners}
      </Link>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{buyer.name}</h1>
          <p className="flex items-center gap-1.5 text-muted">
            <MapPin size={14} aria-hidden />
            {buyer.profile.address || t.regions[buyer.region]}
          </p>
        </div>
        <div className="flex gap-2">
          {!partnership || partnership.status === "rejected" ? (
            <ActionButton path="/api/v1/partnerships" body={{ partnerId: id }}>
              {t.partners.request}
            </ActionButton>
          ) : (
            <Pill tone={partnership.status === "active" ? "success" : "accent"}>{t.partners.status[partnership.status]}</Pill>
          )}
          <StartChatButton partnerId={id} />
        </div>
      </div>

      <Card className="flex flex-col gap-3">
        <h2 className="flex items-center gap-2 font-semibold">
          <Warehouse size={18} aria-hidden />
          {t.stock.partnerTitle}
          {low.length > 0 && <Pill tone="danger">{fmt(t.stock.lowCount, { n: low.length })}</Pill>}
        </h2>
        {stock === null ? (
          <p className="flex items-center gap-2 text-[14px] text-muted">
            <Lock size={16} aria-hidden />
            {t.stock.hidden}
          </p>
        ) : stock.length === 0 ? (
          <p className="text-[14px] text-muted">{t.stock.partnerEmpty}</p>
        ) : (
          <table className="w-full border-collapse text-left text-[14px]">
            <thead>
              <tr className="border-b border-line text-[13px] text-muted">
                <th className="py-2 pr-3 font-medium">{t.products.colName}</th>
                <th className="px-3 py-2 text-right font-medium">{t.stock.quantity}</th>
                <th className="px-3 py-2 text-right font-medium">{t.stock.minLevel}</th>
                <th className="py-2 pl-3 text-right font-medium">{t.stock.updated}</th>
              </tr>
            </thead>
            <tbody>
              {stock.map((s) => (
                <tr key={s.id} className="border-b border-line last:border-0">
                  <td className="py-2 pr-3">
                    {s.name} {s.low && <Pill tone="danger">{t.stock.needed}</Pill>}
                  </td>
                  <td className={`px-3 py-2 text-right tabular-nums ${s.low ? "font-semibold text-danger" : ""}`}>
                    {s.quantity} {units[s.unit] ?? s.unit}
                  </td>
                  <td className="px-3 py-2 text-right text-muted tabular-nums">{s.minLevel}</td>
                  <td className="py-2 pl-3 text-right text-muted">{formatDateTime(s.updatedAt, locale, false)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {low.length > 0 && <p className="text-[13px] text-muted">{t.stock.offerHint}</p>}
      </Card>

      <section className="flex flex-col gap-2.5">
        <h2 className="font-semibold">{t.nav.orders}</h2>
        {orders.length === 0 ? (
          <EmptyState Icon={Warehouse} title={t.orders.empty} />
        ) : (
          orders.map((o) => (
            <Link key={o.id} href={`/orders/${o.id}`} className="flex flex-wrap items-center gap-3 rounded-xl border border-line bg-surface px-4 py-3 hover:border-muted/40">
              <b className="tabular-nums">№{o.number}</b>
              <span className="flex-1 text-[13px] text-muted">{formatDateTime(o.createdAt, locale)}</span>
              <StatusPill status={o.status} t={t} />
              <PaymentPill status={o.paymentStatus} t={t} />
              <b className="w-28 text-right tabular-nums">{formatAmount(o.total)}</b>
            </Link>
          ))
        )}
      </section>
    </article>
  );
}
