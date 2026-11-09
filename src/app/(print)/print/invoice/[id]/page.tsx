import { notFound } from "next/navigation";
import { Party, type PartyInfo } from "@/components/docs/Party";
import { PrintBar } from "@/components/docs/PrintBar";
import { fmt, formatDateTime } from "@/i18n/format";
import { getDictionary, getLocale } from "@/i18n/server";
import { requireUser } from "@/lib/auth/guard";
import { formatAmount } from "@/lib/catalog";
import { getOrder } from "@/server/orders";
import { getProfile } from "@/server/profile";

export const metadata = { title: "Hisob-faktura" };

/** Buyurtma bo'yicha hisob-faktura (yuk xati) — ikki tomon imzosi uchun chop etiladi. */
export default async function InvoicePage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const locale = await getLocale();
  const t = getDictionary(locale);
  const o = await getOrder(user, (await params).id);
  if (!o) notFound();
  const [sp, bp] = await Promise.all([getProfile(o.seller.id), getProfile(o.buyer.id)]);
  const units = t.units as Record<string, string>;
  const seller: PartyInfo = { name: o.seller.name, phone: o.seller.phone, address: sp?.profile.address ?? "", ...(sp ? sp.profile : {}) };
  const buyer: PartyInfo = { name: o.buyer.name, phone: o.delivery.phone, address: o.delivery.address ? `${o.delivery.address}, ${t.regions[o.delivery.region]}` : "", ...(bp ? { inn: bp.profile.inn, bankName: bp.profile.bankName, bankAccount: bp.profile.bankAccount, mfo: bp.profile.mfo } : {}) };

  return (
    <>
      <PrintBar back={`/orders/${o.id}`} />
      <article className="print-doc mx-auto flex max-w-[210mm] flex-col gap-5 px-[14mm] py-[12mm] shadow-sm">
        <header className="text-center">
          <h1 className="text-[18px] font-bold">{fmt(t.docs.invoiceTitle, { n: o.number })}</h1>
          <p className="text-[13px]">{fmt(t.docs.dated, { date: formatDateTime(o.createdAt, locale, false) })}</p>
        </header>

        <div className="grid grid-cols-2 gap-6">
          <Party title={t.docs.supplier} p={seller} t={t} />
          <Party title={t.docs.customer} p={buyer} t={t} />
        </div>

        <table className="w-full border-collapse text-[13px]">
          <thead>
            <tr className="bg-neutral-100 text-left">
              <th className="w-8 text-center">{t.docs.num}</th>
              <th>{t.docs.product}</th>
              <th className="w-16 text-center">{t.docs.unit}</th>
              <th className="w-20 text-right">{t.docs.qty}</th>
              <th className="w-28 text-right">{t.docs.price}</th>
              <th className="w-32 text-right">{t.docs.sum}</th>
            </tr>
          </thead>
          <tbody>
            {o.items.map((i, n) => (
              <tr key={i.productId}>
                <td className="text-center">{n + 1}</td>
                <td>{i.name}</td>
                <td className="text-center">{units[i.unit] ?? i.unit}</td>
                <td className="text-right tabular-nums">{i.quantity}</td>
                <td className="text-right tabular-nums">{formatAmount(i.unitPrice)}</td>
                <td className="text-right tabular-nums">{formatAmount(i.total)}</td>
              </tr>
            ))}
            <tr>
              <td colSpan={5} className="text-right">
                {t.cart.subtotal}
              </td>
              <td className="text-right tabular-nums">{formatAmount(o.subtotal)}</td>
            </tr>
            {o.discount > 0 && (
              <tr>
                <td colSpan={5} className="text-right">
                  {fmt(t.cart.discount, { n: o.discountPercent })}
                </td>
                <td className="text-right tabular-nums">−{formatAmount(o.discount)}</td>
              </tr>
            )}
            {o.deliveryFee > 0 && (
              <tr>
                <td colSpan={5} className="text-right">
                  {t.cart.delivery}
                </td>
                <td className="text-right tabular-nums">{formatAmount(o.deliveryFee)}</td>
              </tr>
            )}
            <tr className="font-bold">
              <td colSpan={5} className="text-right">
                {t.cart.total}
              </td>
              <td className="text-right tabular-nums">{formatAmount(o.total)}</td>
            </tr>
          </tbody>
        </table>

        <div className="flex flex-col gap-1 text-[13px]">
          <b>{fmt(t.docs.totalWords, { sum: formatAmount(o.total) })}</b>
          <span>
            {t.checkout.payment}: {t.payment[o.paymentMethod]} · {t.orders.payment}: {t.paymentStatus[o.paymentStatus]}
            {o.dueDate && ` · ${t.orders.dueDate}: ${formatDateTime(o.dueDate, locale, false)}`}
          </span>
          {o.comment && <span className="whitespace-pre-line">{o.comment}</span>}
        </div>

        <div className="mt-8 grid grid-cols-2 gap-10 text-[13px]">
          {[t.docs.released, t.docs.received].map((label) => (
            <div key={label} className="flex flex-col gap-1">
              <span>{label}:</span>
              <span className="mt-6 border-b border-neutral-500" />
              <span className="text-center text-[11px] text-neutral-500">{t.docs.signature}</span>
            </div>
          ))}
        </div>
        <footer className="mt-auto pt-6 text-center text-[11px] text-neutral-500">{fmt(t.docs.generated, { date: formatDateTime(new Date().toISOString(), locale) })}</footer>
      </article>
    </>
  );
}
