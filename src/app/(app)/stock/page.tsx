import { Warehouse } from "lucide-react";
import { Alert } from "@/components/ui/Alert";
import { PageTitle, Stat } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { getDictionary, getLocale } from "@/i18n/server";
import { requireUser } from "@/lib/auth/guard";
import { listMyStock } from "@/server/stock";
import { StockRowEditor } from "./StockRowEditor";

export const metadata = { title: "Ombor" };

/** Do'kon ombori: yetkazilgan mahsulotlar avtomatik qo'shiladi, do'kon qoldiqni yangilab boradi. */
export default async function StockPage() {
  const user = await requireUser("buyer");
  const t = getDictionary(await getLocale());
  const rows = await listMyStock(user.id);
  const low = rows.filter((r) => r.low).length;

  return (
    <section className="flex flex-col gap-5">
      <PageTitle>{t.nav.stock}</PageTitle>
      <Alert tone="info">{t.stock.lead}</Alert>
      {rows.length === 0 ? (
        <EmptyState Icon={Warehouse} title={t.stock.empty} hint={t.stock.emptyHint} />
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-2">
            <Stat label={t.stock.total} value={rows.length} />
            <Stat label={t.stock.lowTotal} value={low} tone={low ? "danger" : undefined} />
          </div>
          <div className="overflow-x-auto rounded-xl border border-line bg-surface">
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
    </section>
  );
}
