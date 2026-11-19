import { Building2, ChevronRight, Truck, Warehouse } from "lucide-react";
import Link from "next/link";
import { Alert } from "@/components/ui/Alert";
import { PageTitle, Pill, Stat } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { SideCard } from "@/components/ui/SideCard";
import { fmt, formatDateTime } from "@/i18n/format";
import { getDictionary, getLocale } from "@/i18n/server";
import { requireUser } from "@/lib/auth/guard";
import { formatAmount } from "@/lib/catalog";
import { listOrders, orderCounts } from "@/server/orders";
import { listMyStock } from "@/server/stock";
import { StockRowEditor } from "./StockRowEditor";

export const metadata = { title: "Ombor" };

/** Do'kon ombori: yetkazilgan mahsulotlar avtomatik qo'shiladi, do'kon qoldiqni yangilab boradi. */
export default async function StockPage() {
  const user = await requireUser("buyer");
  const locale = await getLocale();
  const t = getDictionary(locale);
  const [rows, delivered, counts] = await Promise.all([listMyStock(user.id), listOrders(user, { status: "delivered", limit: 4 }), orderCounts(user)]);
  const low = rows.filter((r) => r.low).length;
  // Yetkazib beruvchilar bo'yicha: nechta mahsulot va nechtasi kam qolgan (avval kam qolgani ko'p bo'lganlar).
  const bySupplier = [...rows.reduce((map, r) => {
    const s = map.get(r.seller.id) ?? { id: r.seller.id, name: r.seller.name, total: 0, low: 0 };
    s.total += 1;
    if (r.low) s.low += 1;
    return map.set(r.seller.id, s);
  }, new Map<string, { id: string; name: string; total: number; low: number }>()).values()].sort((a, b) => b.low - a.low || b.total - a.total);

  return (
    <section className="flex flex-col gap-5">
      <PageTitle>{t.nav.stock}</PageTitle>
      <Alert tone="info">{t.stock.lead}</Alert>
      {rows.length === 0 ? (
        <EmptyState Icon={Warehouse} title={t.stock.empty} hint={t.stock.emptyHint} />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Stat label={t.stock.total} value={rows.length} />
            <Stat label={t.stock.lowTotal} value={low} tone={low ? "danger" : undefined} />
            <Stat label={t.stock.statSuppliers} value={bySupplier.length} />
            <Stat label={t.stock.statDelivered} value={counts.byStatus.delivered} tone={counts.byStatus.delivered ? "success" : undefined} />
          </div>
          <div className="overflow-x-auto glass-card rounded-2xl">
            <table className="w-full min-w-[620px] border-collapse text-left text-[14px]">
              <thead>
                <tr className="border-b border-line text-[13px] text-muted">
                  <th className="px-4 py-3 font-medium">{t.products.colName}</th>
                  <th className="px-2 py-3 text-right font-medium">{t.stock.quantity}</th>
                  <th className="px-2 py-3 text-right font-medium">{t.stock.minLevel}</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <StockRowEditor key={r.id} row={r} />
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      <div className="grid items-start gap-4 lg:grid-cols-2">
        <SideCard Icon={Truck} title={t.stock.deliveredTitle}>
          {delivered.length === 0 ? (
            <p className="text-muted">{t.stock.deliveredNone}</p>
          ) : (
            <ul className="-mx-2 flex flex-col">
              {delivered.map((o) => (
                <li key={o.id}>
                  <Link href={`/orders/${o.id}`} className="flex items-center gap-3 rounded-xl px-2 py-2.5 transition-colors hover:bg-accent-soft/60">
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-semibold">
                        №{o.number} · {o.seller.name}
                      </span>
                      <span className="block truncate text-[12px] text-muted">
                        {formatDateTime(o.history.findLast((h) => h.status === "delivered")?.at ?? o.createdAt, locale, false)} · {fmt(t.stock.itemsCount, { n: o.items.length })}
                      </span>
                    </span>
                    <b className="shrink-0 tabular-nums">{formatAmount(o.total)}</b>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </SideCard>

        {bySupplier.length > 0 && (
          <SideCard Icon={Building2} title={t.stock.bySupplierTitle}>
            <ul className="-mx-2 flex flex-col">
              {bySupplier.map((s) => (
                <li key={s.id}>
                  <Link href={`/catalog?seller=${s.id}`} className="group flex items-center gap-3 rounded-xl px-2 py-2.5 transition-colors hover:bg-accent-soft/60">
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-semibold">{s.name}</span>
                      <span className="text-[12px] text-muted">{fmt(t.stock.itemsCount, { n: s.total })}</span>
                    </span>
                    {s.low > 0 ? <Pill tone="danger">{fmt(t.stock.bySupplierLow, { n: s.low })}</Pill> : <Pill tone="success">{t.stock.bySupplierOk}</Pill>}
                    <ChevronRight size={16} className="shrink-0 text-muted transition-transform group-hover:translate-x-0.5" aria-label={t.stock.openProducts} />
                  </Link>
                </li>
              ))}
            </ul>
          </SideCard>
        )}
      </div>
    </section>
  );
}
