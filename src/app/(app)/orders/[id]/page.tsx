import { ArrowLeft, FileText, MapPin, Phone } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { StartChatButton } from "@/components/chat/StartChatButton";
import { PaymentPill, StatusPill } from "@/components/orders/StatusPill";
import { Alert } from "@/components/ui/Alert";
import { Card } from "@/components/ui/Card";
import { fmt, formatDateTime } from "@/i18n/format";
import { getDictionary, getLocale } from "@/i18n/server";
import { requireUser } from "@/lib/auth/guard";
import { formatAmount } from "@/lib/catalog";
import { formatPhone } from "@/lib/phone";
import { getOrder } from "@/server/orders";
import { sellerOnlineMethods } from "@/server/onlinePay";
import { OrderActions } from "./OrderActions";
import { PayOnline } from "./PayOnline";

export default async function OrderPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ placed?: string; paid?: string }> }) {
  const user = await requireUser();
  const locale = await getLocale();
  const t = getDictionary(locale);
  const o = await getOrder(user, (await params).id);
  if (!o) notFound();
  const sp = await searchParams;
  const placed = sp.placed === "1";
  const left = o.total - o.paidAmount;
  // Do'kon uchun: kompaniya Payme/Click ulagan bo'lsa — qolgan summani onlayn to'lash.
  const payMethods = user.role === "buyer" && o.status !== "cancelled" && left > 0 && o.creditApproval !== "pending" ? await sellerOnlineMethods(o.seller.id) : [];
  const isSeller = user.role === "seller";
  const partner = isSeller ? o.buyer : o.seller;
  const units = t.units as Record<string, string>;
  const d = o.delivery;

  return (
    <article className="flex flex-col gap-5">
      <Link href="/orders" className="inline-flex w-fit items-center gap-1.5 text-muted hover:text-text">
        <ArrowLeft size={16} aria-hidden />
        {t.nav.orders}
      </Link>
      {placed && <Alert tone="success">{t.orders.placed}</Alert>}
      {sp.paid === "1" && o.paymentStatus !== "paid" && <Alert tone="info">{t.onlinePay.checking}</Alert>}
      {o.creditApproval === "pending" && o.status === "new" && (
        <Alert tone="info">{fmt(isSeller ? t.orders.creditPendingSeller : t.orders.creditPendingBuyer, { over: formatAmount(o.creditOver) })}</Alert>
      )}
      {o.creditApproval === "approved" && <Alert tone="success">{fmt(t.orders.creditApproved, { over: formatAmount(o.creditOver) })}</Alert>}
      {o.creditApproval === "rejected" && <Alert>{t.orders.creditRejected}</Alert>}

      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-bold tracking-tight">{fmt(t.orders.title, { n: o.number })}</h1>
        <StatusPill status={o.status} t={t} />
        <PaymentPill status={o.paymentStatus} t={t} />
        <Link href={`/print/invoice/${o.id}`} className="ml-auto inline-flex items-center gap-1.5 rounded-lg border border-line bg-surface px-3 py-1.5 text-[14px] font-semibold hover:bg-surface-2">
          <FileText size={16} aria-hidden />
          {t.docs.invoice}
        </Link>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="flex flex-col gap-4">
          <Card className="p-0">
            <table className="w-full border-collapse text-left text-[14px]">
              <thead>
                <tr className="border-b border-line text-[13px] text-muted">
                  <th className="px-4 py-3 font-medium">{t.products.colName}</th>
                  <th className="px-3 py-3 text-right font-medium">{t.cart.quantity}</th>
                  <th className="hidden px-3 py-3 text-right font-medium sm:table-cell">{t.products.colPrice}</th>
                  <th className="px-4 py-3 text-right font-medium">{t.cart.total}</th>
                </tr>
              </thead>
              <tbody>
                {o.items.map((i) => (
                  <tr key={i.productId} className="border-b border-line last:border-0">
                    <td className="px-4 py-3">
                      <Link href={`/catalog/${i.productId}`} className="font-medium hover:text-accent">
                        {i.name}
                      </Link>
                    </td>
                    <td className="px-3 py-3 text-right tabular-nums">
                      {i.quantity} {units[i.unit] ?? i.unit}
                    </td>
                    <td className="hidden px-3 py-3 text-right tabular-nums sm:table-cell">{formatAmount(i.unitPrice)}</td>
                    <td className="px-4 py-3 text-right font-semibold tabular-nums">{formatAmount(i.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <dl className="grid grid-cols-[1fr_auto] gap-x-4 gap-y-1 border-t border-line px-4 py-3 text-[14px]">
              <dt className="text-muted">{t.cart.subtotal}</dt>
              <dd className="text-right tabular-nums">{formatAmount(o.subtotal)}</dd>
              {o.discount > 0 && (
                <>
                  <dt className="text-muted">{fmt(t.cart.discount, { n: o.discountPercent })}</dt>
                  <dd className="text-right tabular-nums">−{formatAmount(o.discount)}</dd>
                </>
              )}
              <dt className="text-muted">{t.cart.delivery}</dt>
              <dd className="text-right tabular-nums">{formatAmount(o.deliveryFee)}</dd>
              <dt className="font-bold">{t.cart.total}</dt>
              <dd className="text-right font-bold tabular-nums">
                {formatAmount(o.total)} {t.common.sum}
              </dd>
              {o.paidAmount > 0 && o.paymentStatus !== "paid" && (
                <>
                  <dt className="text-muted">{t.orders.paid}</dt>
                  <dd className="text-right tabular-nums">{formatAmount(o.paidAmount)}</dd>
                </>
              )}
            </dl>
          </Card>

          <Card>
            <h2 className="mb-3 font-semibold">{t.orders.history}</h2>
            <ol className="flex flex-col gap-2 text-[14px]">
              {o.history.map((h, i) => (
                <li key={i} className="flex gap-3">
                  <span className="mt-1.5 size-2 shrink-0 rounded-full bg-accent" aria-hidden />
                  <span>
                    <b>{t.orderStatus[h.status]}</b> · <span className="text-muted">{formatDateTime(h.at, locale)}</span>
                  </span>
                </li>
              ))}
            </ol>
          </Card>
        </div>

        <aside className="flex flex-col gap-4">
          <Card className="flex flex-col gap-3">
            {payMethods.length > 0 && <PayOnline orderId={o.id} left={left} methods={payMethods} />}
            <OrderActions id={o.id} role={user.role} status={o.status} creditPending={o.creditApproval === "pending"} paymentStatus={o.paymentStatus} paidAmount={o.paidAmount} total={o.total} deliveryDate={d.date} />
          </Card>

          <Card className="flex flex-col gap-2 text-[14px]">
            <span className="text-[12px] font-semibold tracking-wider text-muted uppercase">{isSeller ? t.roles.buyer : t.roles.seller}</span>
            <Link href={isSeller ? `/partners/${partner.id}` : `/suppliers/${partner.id}`} className="font-semibold hover:text-accent">
              {partner.name}
            </Link>
            <StartChatButton partnerId={partner.id} className="mt-1" />
          </Card>

          <Card className="flex flex-col gap-2 text-[14px]">
            <span className="text-[12px] font-semibold tracking-wider text-muted uppercase">{t.orders.delivery}</span>
            <span className="flex items-start gap-2">
              <MapPin size={16} className="mt-0.5 shrink-0 text-muted" aria-hidden />
              {d.method === "pickup" ? (
                <b>{t.orders.pickup}</b>
              ) : (
              <span>
                {d.address}, {t.regions[d.region]}
                {d.lat != null && d.lng != null && (
                  <>
                    {" "}
                    <a href={`https://www.openstreetmap.org/?mlat=${d.lat}&mlon=${d.lng}#map=17/${d.lat}/${d.lng}`} target="_blank" rel="noreferrer" className="font-semibold text-accent hover:underline">
                      {t.orders.onMap}
                    </a>
                  </>
                )}
              </span>
              )}
            </span>
            <a href={`tel:${d.phone}`} className="flex items-center gap-2 hover:text-accent">
              <Phone size={16} className="text-muted" aria-hidden />
              {formatPhone(d.phone)}
            </a>
            <span className="text-muted">
              {t.checkout.payment}: {t.payment[o.paymentMethod]}
            </span>
            {o.dueDate && o.paymentStatus !== "paid" && o.status !== "cancelled" && (
              <span className="text-muted">
                {t.orders.dueDate}: <b className={new Date(o.dueDate).getTime() < Date.now() ? "text-danger" : "text-text"}>{formatDateTime(o.dueDate, locale, false)}</b>
                {new Date(o.dueDate).getTime() < Date.now() && <> · <Link href={`/debts/${partner.id}`} className="font-semibold text-danger hover:underline">{t.orders.overdue}</Link></>}
              </span>
            )}
            {d.date && (
              <span className="text-muted">
                {t.orders.deliveryDate}: <b className="text-text">{formatDateTime(d.date, locale, false)}</b>
              </span>
            )}
            {o.comment && <p className="rounded-lg bg-surface-2 p-3 whitespace-pre-line">{o.comment}</p>}
          </Card>
        </aside>
      </div>
    </article>
  );
}
