import { ClipboardList, Search } from "lucide-react";
import { Chips, Pager } from "@/components/admin/Chips";
import { PaymentPill, StatusPill } from "@/components/orders/StatusPill";
import { PageTitle } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { fmt, formatDateTime } from "@/i18n/format";
import { getDictionary, getLocale } from "@/i18n/server";
import { requireAdmin } from "@/lib/auth/guard";
import { formatAmount } from "@/lib/catalog";
import {
  ORDER_STATUSES,
  type OrderStatus,
  type PaymentStatus,
} from "@/lib/orders";
import { listOrdersAdmin } from "@/server/admin";

export const metadata = { title: "Buyurtmalar monitoringi" };

type Params = { q?: string; status?: string; page?: string };

/** Administrator: platformadagi barcha buyurtmalar (faqat ko'rish) — raqam yoki ishtirokchi bo'yicha qidiruv, holat filtri. */
export default async function AdminOrders({
  searchParams,
}: {
  searchParams: Promise<Params>;
}) {
  await requireAdmin();
  const locale = await getLocale();
  const t = getDictionary(locale);
  const sp = await searchParams;
  const status = (ORDER_STATUSES as readonly string[]).includes(sp.status ?? "")
    ? (sp.status as OrderStatus)
    : undefined;
  const q = sp.q?.trim() || undefined;
  const data = await listOrdersAdmin({ q, status, page: Number(sp.page) || 1 });
  const href = (patch: Partial<Params>) => {
    const p = new URLSearchParams();
    for (const [k, v] of Object.entries({ q, status, ...patch }))
      if (v) p.set(k, String(v));
    const s = p.toString();
    return s ? `/admin/orders?${s}` : "/admin/orders";
  };

  return (
    <section className="flex flex-col gap-4">
      <PageTitle lead={t.adminOrders.lead}>{t.adminNav.orders}</PageTitle>
      <form action="/admin/orders" className="flex gap-2">
        {status && <input type="hidden" name="status" value={status} />}
        <label className="flex h-10 min-w-0 flex-1 items-center gap-2 rounded-xl border border-line bg-[var(--c-glass-strong)] px-3 text-muted focus-within:border-accent">
          <Search size={16} aria-hidden />
          <input
            name="q"
            type="search"
            defaultValue={q}
            placeholder={t.adminOrders.search}
            aria-label={t.adminOrders.search}
            className="focus-none min-w-0 flex-1 bg-transparent text-text outline-none"
          />
        </label>
        <button className="h-10 cursor-pointer rounded-xl bg-accent px-4 text-[14px] font-semibold text-accent-fg">
          {t.admin.find}
        </button>
      </form>
      <Chips
        label={t.admin.status}
        items={[
          {
            href: href({ status: undefined, page: undefined }),
            label: t.catalog.all,
            active: !status,
          },
          ...ORDER_STATUSES.map((s) => ({
            href: href({ status: s, page: undefined }),
            label: t.orderStatus[s],
            active: status === s,
          })),
        ]}
      />
      <p className="text-[13px] text-muted">
        {fmt(t.adminOrders.summary, {
          n: data.total,
          sum: formatAmount(data.value),
        })}
      </p>
      {data.items.length === 0 ? (
        <EmptyState Icon={ClipboardList} title={t.adminOrders.empty} />
      ) : (
        <>
          {/* Telefon: ixcham kartalar (jadval yonga suriladi va holat ko'rinmay qoladi). */}
          <ul className="glass-card flex flex-col divide-y divide-line rounded-2xl sm:hidden">
            {data.items.map((o) => (
              <li key={o.id} className="flex flex-col gap-1.5 px-4 py-3">
                <span className="flex items-baseline justify-between gap-3">
                  <span className="font-semibold tabular-nums">
                    № {o.number}
                  </span>
                  <span className="font-semibold tabular-nums">
                    {formatAmount(o.total)}
                  </span>
                </span>
                <span className="text-[13px] text-muted">
                  {o.buyer} → {o.seller}
                </span>
                <span className="flex flex-wrap items-center gap-1">
                  <StatusPill status={o.status} t={t} />
                  <PaymentPill
                    status={o.paymentStatus as PaymentStatus}
                    t={t}
                  />
                  <span className="ml-auto text-[12px] text-muted">
                    {formatDateTime(o.createdAt, locale)}
                  </span>
                </span>
              </li>
            ))}
          </ul>
          <div className="glass-card hidden overflow-x-auto rounded-2xl sm:block">
            <table className="w-full min-w-[760px] border-collapse text-left text-[14px]">
              <thead>
                <tr className="border-b border-line text-[12px] text-muted">
                  <th className="px-4 py-2.5 font-medium">№</th>
                  <th className="px-3 py-2.5 font-medium">{t.roles.buyer}</th>
                  <th className="px-3 py-2.5 font-medium">{t.roles.seller}</th>
                  <th className="px-3 py-2.5 font-medium">{t.admin.status}</th>
                  <th className="px-3 py-2.5 text-right font-medium">
                    {t.cart.total}
                  </th>
                  <th className="px-4 py-2.5 text-right font-medium">
                    {t.adminOrders.date}
                  </th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((o) => (
                  <tr key={o.id} className="border-b border-line last:border-0">
                    <td className="px-4 py-2.5 font-semibold tabular-nums">
                      {o.number}
                    </td>
                    <td className="px-3 py-2.5">{o.buyer}</td>
                    <td className="px-3 py-2.5">{o.seller}</td>
                    <td className="px-3 py-2.5">
                      <span className="flex flex-wrap gap-1">
                        <StatusPill status={o.status} t={t} />
                        <PaymentPill
                          status={o.paymentStatus as PaymentStatus}
                          t={t}
                        />
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-right font-semibold tabular-nums">
                      {formatAmount(o.total)}
                    </td>
                    <td className="px-4 py-2.5 text-right text-[13px] whitespace-nowrap text-muted">
                      {formatDateTime(o.createdAt, locale)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
      <Pager
        page={data.page}
        pages={data.pages}
        href={(n) => href({ page: String(n) })}
        prev={t.catalog.prev}
        next={t.catalog.next}
      />
    </section>
  );
}
