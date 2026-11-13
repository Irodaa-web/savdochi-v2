import { ArrowLeft, FileText } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { StartChatButton } from "@/components/chat/StartChatButton";
import { Card, Pill, Stat } from "@/components/ui/Card";
import { LinkButton } from "@/components/ui/LinkButton";
import { fmt, formatDateTime } from "@/i18n/format";
import { getDictionary, getLocale } from "@/i18n/server";
import { requireUser } from "@/lib/auth/guard";
import { formatAmount } from "@/lib/catalog";
import { formatPhone } from "@/lib/phone";
import { partnerLedger } from "@/server/debts";
import { PaymentForm } from "./PaymentForm";

export const metadata = { title: "Qarz daftari" };

/** Bitta hamkor bilan qarz daftari: to'lanmagan buyurtmalar, to'lovlar va (kompaniya uchun) to'lovni qayd etish. */
export default async function LedgerPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const locale = await getLocale();
  const t = getDictionary(locale);
  const ledger = await partnerLedger(user, (await params).id);
  if (!ledger) notFound();
  const isSeller = user.role === "seller";
  const { partner } = ledger;

  return (
    <article className="flex flex-col gap-5">
      <Link href="/debts" className="inline-flex w-fit items-center gap-1.5 text-muted hover:text-text">
        <ArrowLeft size={16} aria-hidden />
        {t.debts.back}
      </Link>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{partner.name}</h1>
          {partner.phone && <p className="text-muted">{formatPhone(partner.phone)}</p>}
        </div>
        <div className="flex flex-wrap gap-2">
          <LinkButton href={`/print/statement/${partner.id}`} variant="secondary">
            <FileText size={16} aria-hidden />
            {t.debts.statement}
          </LinkButton>
          <StartChatButton partnerId={partner.id} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        <Stat label={t.debts.outstanding} value={formatAmount(ledger.outstanding)} />
        <Stat label={t.debts.overdue} value={formatAmount(ledger.overdue)} tone={ledger.overdue ? "danger" : undefined} />
        <Stat label={t.debts.limit} value={ledger.creditLimit > 0 ? formatAmount(ledger.creditLimit) : t.debts.noLimit} />
      </div>
      {ledger.creditLimit > 0 && <p className="text-[13px] text-muted">{fmt(t.partners.creditNote, { limit: formatAmount(ledger.creditLimit), days: ledger.paymentDays })}</p>}

      <div className="grid gap-5 lg:grid-cols-[1fr_340px]">
        <div className="flex flex-col gap-5">
          <Card className="overflow-x-auto p-0">
            <h2 className="px-5 pt-4 pb-2 font-semibold">{t.debts.unpaidOrders}</h2>
            {!isSeller && ledger.orders.length > 0 && <p className="px-5 pb-2 text-[13px] text-muted">{t.onlinePay.debtsHint}</p>}
            {ledger.orders.length === 0 ? (
              <p className="px-5 pb-5 text-[14px] text-muted">{t.debts.emptyHint}</p>
            ) : (
              <table className="w-full min-w-[560px] border-collapse text-left text-[14px]">
                <thead>
                  <tr className="border-b border-line text-[13px] text-muted">
                    <th className="px-5 py-2 font-medium">{t.debts.order}</th>
                    <th className="px-3 py-2 font-medium">{t.debts.date}</th>
                    <th className="px-3 py-2 text-right font-medium">{t.cart.total}</th>
                    <th className="px-3 py-2 text-right font-medium">{t.orders.paid}</th>
                    <th className="px-3 py-2 text-right font-medium">{t.debts.left}</th>
                    <th className="px-5 py-2 text-right font-medium">{t.orders.dueDate}</th>
                    {!isSeller && <th className="py-2 pr-5" />}
                  </tr>
                </thead>
                <tbody>
                  {ledger.orders.map((o) => (
                    <tr key={o.id} className="border-b border-line last:border-0">
                      <td className="px-5 py-2.5">
                        <Link href={`/orders/${o.id}`} className="font-semibold hover:text-accent">
                          №{o.number}
                        </Link>
                      </td>
                      <td className="px-3 py-2.5 text-muted">{formatDateTime(o.createdAt, locale, false)}</td>
                      <td className="px-3 py-2.5 text-right tabular-nums">{formatAmount(o.total)}</td>
                      <td className="px-3 py-2.5 text-right text-muted tabular-nums">{formatAmount(o.paid)}</td>
                      <td className="px-3 py-2.5 text-right font-semibold tabular-nums">{formatAmount(o.left)}</td>
                      <td className="px-5 py-2.5 text-right">
                        {o.dueDate ? o.overdue ? <Pill tone="danger">{formatDateTime(o.dueDate, locale, false)}</Pill> : formatDateTime(o.dueDate, locale, false) : "—"}
                      </td>
                      {!isSeller && (
                        <td className="py-2.5 pr-5 text-right">
                          <Link href={`/orders/${o.id}`} className="inline-flex h-8 items-center rounded-lg bg-accent px-3 text-[13px] font-semibold text-accent-fg hover:bg-accent-hover">
                            {t.onlinePay.payNow}
                          </Link>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Card>

          <Card className="flex flex-col gap-3">
            <h2 className="font-semibold">{t.debts.payments}</h2>
            {ledger.payments.length === 0 ? (
              <p className="text-[14px] text-muted">{t.debts.noPayments}</p>
            ) : (
              <ul className="flex flex-col divide-y divide-line text-[14px]">
                {ledger.payments.map((p) => (
                  <li key={p.id} className="flex flex-wrap items-baseline justify-between gap-2 py-2.5">
                    <span>
                      <b className={p.amount < 0 ? "text-danger" : "text-success"}>
                        {p.amount > 0 ? "+" : ""}
                        {formatAmount(p.amount)}
                      </b>
                      <span className="text-muted">
                        {" "}
                        · {p.source === "ledger" ? t.debts.sourceLedger : p.source === "online" ? `${t.debts.sourceOnline}${p.note ? ` (${p.note.split(":")[0]})` : ""}` : t.debts.sourceOrder}
                        {p.orders.length > 0 && ` · ${p.orders.map((n) => `№${n}`).join(", ")}`}
                      </span>
                      {p.note && <span className="block text-[13px] text-muted">{p.note}</span>}
                    </span>
                    <span className="text-[13px] text-muted">{formatDateTime(p.createdAt, locale)}</span>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>

        {isSeller && ledger.outstanding > 0 && (
          <aside>
            <Card>
              <PaymentForm partnerId={partner.id} outstanding={ledger.outstanding} />
            </Card>
          </aside>
        )}
      </div>
    </article>
  );
}
