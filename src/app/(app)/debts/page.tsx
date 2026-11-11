import { Wallet } from "lucide-react";
import Link from "next/link";
import { Card, PageTitle, Pill, Stat } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatDateTime } from "@/i18n/format";
import { getDictionary, getLocale } from "@/i18n/server";
import { requireUser } from "@/lib/auth/guard";
import { formatAmount } from "@/lib/catalog";
import { formatPhone } from "@/lib/phone";
import { listDebts } from "@/server/debts";

export const metadata = { title: "Qarzlar" };

/** Qarz daftari: hamkorlar bo'yicha to'lanmagan summalar va muddati o'tganlar. */
export default async function DebtsPage() {
  const user = await requireUser();
  const locale = await getLocale();
  const t = getDictionary(locale);
  const { rows, totalOutstanding, totalOverdue } = await listDebts(user);
  const isSeller = user.role === "seller";

  return (
    <section className="flex flex-col gap-5">
      <PageTitle>{t.debts.title}</PageTitle>
      <p className="max-w-2xl text-muted">{isSeller ? t.debts.leadSeller : t.debts.leadBuyer}</p>

      <div className="grid grid-cols-2 gap-3 sm:max-w-xl">
        <Stat label={t.debts.totalOutstanding} value={formatAmount(totalOutstanding)} />
        <Stat label={t.debts.totalOverdue} value={formatAmount(totalOverdue)} tone={totalOverdue ? "danger" : undefined} />
      </div>

      {rows.length === 0 ? (
        <EmptyState Icon={Wallet} title={t.debts.empty} hint={t.debts.emptyHint} />
      ) : (
        <Card className="overflow-x-auto p-0">
          <table className="w-full min-w-[640px] border-collapse text-left text-[14px]">
            <thead>
              <tr className="border-b border-line text-[13px] text-muted">
                <th className="px-4 py-3 font-medium">{t.debts.partner}</th>
                <th className="px-3 py-3 text-right font-medium">{t.debts.outstanding}</th>
                <th className="px-3 py-3 text-right font-medium">{t.debts.overdue}</th>
                <th className="px-3 py-3 text-right font-medium">{t.debts.limit}</th>
                <th className="px-4 py-3 text-right font-medium">{t.debts.nextDue}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.partner.id} className="border-b border-line last:border-0 hover:bg-surface-2">
                  <td className="px-4 py-3">
                    <Link href={`/debts/${r.partner.id}`} className="font-semibold hover:text-accent">
                      {r.partner.name}
                    </Link>
                    {r.partner.phone && <div className="text-[12px] text-muted">{formatPhone(r.partner.phone)}</div>}
                  </td>
                  <td className="px-3 py-3 text-right font-semibold tabular-nums">{formatAmount(r.outstanding)}</td>
                  <td className="px-3 py-3 text-right tabular-nums">{r.overdue > 0 ? <Pill tone="danger">{formatAmount(r.overdue)}</Pill> : "—"}</td>
                  <td className="px-3 py-3 text-right text-muted tabular-nums">{r.creditLimit > 0 ? formatAmount(r.creditLimit) : t.debts.noLimit}</td>
                  <td className="px-4 py-3 text-right text-muted">{r.nextDue ? formatDateTime(r.nextDue, locale, false) : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </section>
  );
}
