import { notFound } from "next/navigation";
import { Party } from "@/components/docs/Party";
import { PrintBar } from "@/components/docs/PrintBar";
import { fmt, formatDateTime } from "@/i18n/format";
import { getDictionary, getLocale } from "@/i18n/server";
import { requireUser } from "@/lib/auth/guard";
import { formatAmount } from "@/lib/catalog";
import { statement, tashkentDay } from "@/server/debts";

export const metadata = { title: "Akt sverka" };

const DAY = /^\d{4}-\d{2}-\d{2}$/;
/** Bugungi sana Toshkent vaqti bo'yicha, YYYY-MM-DD. */
const today = () => new Date(Date.now() + 5 * 3600_000).toISOString().slice(0, 10);

/** Hamkor bilan o'zaro hisob-kitoblarni solishtirish dalolatnomasi (akt sverka). :id — hamkor. */
export default async function StatementPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ from?: string; to?: string }> }) {
  const user = await requireUser();
  const locale = await getLocale();
  const t = getDictionary(locale);
  const id = (await params).id;
  const sp = await searchParams;
  const to = sp.to && DAY.test(sp.to) ? sp.to : today();
  const from = sp.from && DAY.test(sp.from) && sp.from <= to ? sp.from : `${to.slice(0, 4)}-01-01`;
  const s = await statement(user, id, from, to);
  if (!s) notFound();
  const day = (d: string) => formatDateTime(tashkentDay(d).toISOString(), locale, false);
  const closingDate = day(s.to);
  const docName = (r: (typeof s.rows)[number]) =>
    r.kind === "order" ? fmt(t.docs.orderDoc, { n: r.number ?? "" }) : `${r.kind === "payment" ? t.docs.paymentDoc : t.docs.correctionDoc}${r.number ? ` (№${r.number})` : ""}`;

  return (
    <>
      <PrintBar back={`/debts/${id}`}>
        <form className="flex flex-wrap items-end gap-2" method="get">
          <label className="flex flex-col gap-1 text-[13px] font-medium">
            {t.docs.from}
            <input type="date" name="from" defaultValue={from} className="h-10 rounded-lg border border-line bg-surface px-3" />
          </label>
          <label className="flex flex-col gap-1 text-[13px] font-medium">
            {t.docs.to}
            <input type="date" name="to" defaultValue={to} className="h-10 rounded-lg border border-line bg-surface px-3" />
          </label>
          <button type="submit" className="h-10 cursor-pointer rounded-lg border border-line bg-surface px-4 font-semibold hover:bg-surface-2">
            {t.docs.show}
          </button>
        </form>
      </PrintBar>

      <article className="print-doc mx-auto flex max-w-[210mm] flex-col gap-5 px-[14mm] py-[12mm] shadow-sm">
        <header className="text-center">
          <h1 className="text-[17px] font-bold">{t.docs.statementTitle}</h1>
          <p className="text-[13px]">
            {s.seller.name} — {s.buyer.name}
          </p>
          <p className="text-[13px]">{fmt(t.docs.period, { from: day(s.from), to: day(s.to) })}</p>
        </header>

        <div className="grid grid-cols-2 gap-6">
          <Party title={t.docs.supplier} p={s.seller} t={t} />
          <Party title={t.docs.customer} p={s.buyer} t={t} />
        </div>

        <table className="w-full border-collapse text-[13px]">
          <thead>
            <tr className="bg-neutral-100 text-left">
              <th className="w-24">{t.docs.date}</th>
              <th>{t.docs.document}</th>
              <th className="w-36 text-right">{t.docs.debit}</th>
              <th className="w-36 text-right">{t.docs.credit}</th>
            </tr>
          </thead>
          <tbody>
            <tr className="font-semibold">
              <td colSpan={2}>{t.docs.opening}</td>
              <td className="text-right tabular-nums">{s.opening > 0 ? formatAmount(s.opening) : ""}</td>
              <td className="text-right tabular-nums">{s.opening < 0 ? formatAmount(-s.opening) : ""}</td>
            </tr>
            {s.rows.map((r, i) => (
              <tr key={i}>
                <td>{formatDateTime(r.date, locale, false)}</td>
                <td>{docName(r)}</td>
                <td className="text-right tabular-nums">{r.debit ? formatAmount(r.debit) : ""}</td>
                <td className="text-right tabular-nums">{r.credit ? formatAmount(r.credit) : ""}</td>
              </tr>
            ))}
            <tr className="font-semibold">
              <td colSpan={2}>{t.docs.turnover}</td>
              <td className="text-right tabular-nums">{formatAmount(s.totalDebit)}</td>
              <td className="text-right tabular-nums">{formatAmount(s.totalCredit)}</td>
            </tr>
            <tr className="font-bold">
              <td colSpan={2}>{t.docs.closing}</td>
              <td className="text-right tabular-nums">{s.closing > 0 ? formatAmount(s.closing) : ""}</td>
              <td className="text-right tabular-nums">{s.closing < 0 ? formatAmount(-s.closing) : ""}</td>
            </tr>
          </tbody>
        </table>

        <p className="text-[13px] font-semibold">
          {s.closing > 0
            ? fmt(t.docs.debtNote, { date: closingDate, debtor: s.buyer.name, creditor: s.seller.name, sum: formatAmount(s.closing) })
            : s.closing < 0
              ? fmt(t.docs.debtNote, { date: closingDate, debtor: s.seller.name, creditor: s.buyer.name, sum: formatAmount(-s.closing) })
              : fmt(t.docs.noDebt, { date: closingDate })}
        </p>

        <div className="mt-8 grid grid-cols-2 gap-10 text-[13px]">
          {[s.seller.name, s.buyer.name].map((name) => (
            <div key={name} className="flex flex-col gap-1">
              <span className="font-semibold">{name}</span>
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
