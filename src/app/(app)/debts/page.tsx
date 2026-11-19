import { CalendarClock, Hourglass, Wallet } from "lucide-react";
import Link from "next/link";
import { Card, PageTitle, Pill, Stat } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { SideCard } from "@/components/ui/SideCard";
import { fmt, formatDateTime } from "@/i18n/format";
import { getDictionary, getLocale } from "@/i18n/server";
import { requireUser } from "@/lib/auth/guard";
import { formatAmount } from "@/lib/catalog";
import { formatPhone } from "@/lib/phone";
import { debtAging, listDebts, type AgingKey } from "@/server/debts";

export const metadata = { title: "Qarzlar" };

/** Qarz daftari: hamkorlar bo'yicha to'lanmagan summalar va muddati o'tganlar. */
export default async function DebtsPage() {
  const user = await requireUser();
  const locale = await getLocale();
  const t = getDictionary(locale);
  const [{ rows, totalOutstanding, totalOverdue }, aging] = await Promise.all([listDebts(user), debtAging(user)]);
  const isSeller = user.role === "seller";
  const agingRows: { key: AgingKey; label: string; overdue: boolean }[] = [
    { key: "soon", label: t.debts.agingSoon, overdue: false },
    { key: "later", label: t.debts.agingLater, overdue: false },
    { key: "d7", label: t.debts.agingD7, overdue: true },
    { key: "d30", label: t.debts.agingD30, overdue: true },
    { key: "d30plus", label: t.debts.agingD30plus, overdue: true },
    { key: "none", label: t.debts.agingNone, overdue: false },
  ].filter((r) => aging[r.key as AgingKey].amount > 0) as { key: AgingKey; label: string; overdue: boolean }[];
  const agingMax = Math.max(1, ...agingRows.map((r) => aging[r.key].amount));
  // Hamkorlar bo'yicha eng yaqin to'lov muddati (kechikkanlari ham) — sanasi bo'yicha.
  const dayMs = 86_400_000;
  const due = rows
    .filter((r) => r.nextDue)
    .map((r) => ({ ...r, days: Math.floor((new Date(r.nextDue!).getTime() - Date.now()) / dayMs) }))
    .sort((a, b) => a.days - b.days)
    .slice(0, 6);

  return (
    <section className="flex flex-col gap-5">
      <PageTitle>{t.debts.title}</PageTitle>
      <p className="max-w-2xl text-muted">{isSeller ? t.debts.leadSeller : t.debts.leadBuyer}</p>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label={t.debts.totalOutstanding} value={formatAmount(totalOutstanding)} />
        <Stat label={t.debts.totalOverdue} value={formatAmount(totalOverdue)} tone={totalOverdue ? "danger" : undefined} />
        <Stat label={t.debts.statPartners} value={rows.length} />
        <Stat label={t.debts.statSoon} value={formatAmount(aging.soon.amount)} tone={aging.soon.amount ? "accent" : undefined} />
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

      {rows.length > 0 && (
        <div className="grid items-start gap-4 lg:grid-cols-2">
          <SideCard Icon={Hourglass} title={t.debts.agingTitle}>
            <ul className="flex flex-col gap-3">
              {agingRows.map(({ key, label, overdue }) => {
                const { amount, orders } = aging[key];
                return (
                  <li key={key}>
                    <div className="flex items-baseline justify-between gap-3">
                      <span>{label}</span>
                      <b className="shrink-0 tabular-nums">{formatAmount(amount)}</b>
                    </div>
                    <div className="mt-1 flex items-center gap-3">
                      {/* Muddati o'tgani — qizil (holat rangi), qolgani — ko'k. Summa matnda yozilgan. */}
                      <div className="h-1.5 flex-1">
                        <div aria-hidden className={`h-full rounded-r-[4px] ${overdue ? "bg-danger" : "bg-chart"}`} style={{ width: `${amount ? Math.max(2, (amount / agingMax) * 100) : 0}%` }} />
                      </div>
                      <span className="w-24 shrink-0 text-right text-[12px] text-muted">{fmt(t.debts.agingOrders, { n: orders })}</span>
                    </div>
                  </li>
                );
              })}
            </ul>
          </SideCard>

          <SideCard Icon={CalendarClock} title={t.debts.dueTitle}>
            {due.length === 0 ? (
              <p className="text-muted">{t.debts.dueEmpty}</p>
            ) : (
              <ul className="-mx-2 flex flex-col">
                {due.map((r) => (
                  <li key={r.partner.id}>
                    <Link href={`/debts/${r.partner.id}`} className="flex items-center gap-3 rounded-xl px-2 py-2.5 transition-colors hover:bg-accent-soft/60">
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-semibold">{r.partner.name}</span>
                        <span className="text-[12px] text-muted">{formatDateTime(r.nextDue!, locale, false)}</span>
                      </span>
                      <span className="text-right">
                        <b className="block tabular-nums">{formatAmount(r.outstanding)}</b>
                        <span className={`text-[12px] font-medium ${r.days < 0 ? "text-danger" : r.days <= 7 ? "text-accent" : "text-muted"}`}>
                          {r.days < 0 ? fmt(t.debts.dueLate, { n: -r.days }) : r.days === 0 ? t.debts.dueToday : fmt(t.debts.dueIn, { n: r.days })}
                        </span>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </SideCard>
        </div>
      )}
    </section>
  );
}
