import clsx from "clsx";
import { ClipboardList } from "lucide-react";
import Link from "next/link";
import { PaymentPill, StatusPill } from "@/components/orders/StatusPill";
import { PageTitle } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatDateTime } from "@/i18n/format";
import { getDictionary, getLocale } from "@/i18n/server";
import { requireUser } from "@/lib/auth/guard";
import { formatAmount } from "@/lib/catalog";
import { ORDER_STATUSES, type OrderStatus } from "@/lib/orders";
import { listOrders } from "@/server/orders";

export const metadata = { title: "Buyurtmalar" };

const FILTERS = ["all", "open", ...ORDER_STATUSES] as const;

export default async function OrdersPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const user = await requireUser();
  const locale = await getLocale();
  const t = getDictionary(locale);
  const raw = (await searchParams).status ?? "all";
  const filter = (FILTERS as readonly string[]).includes(raw) ? raw : "all";
  const orders = await listOrders(user, { status: filter === "all" ? undefined : (filter as OrderStatus | "open") });
  const isSeller = user.role === "seller";

  return (
    <section className="flex flex-col gap-5">
      <PageTitle>{t.nav.orders}</PageTitle>
      <nav className="flex gap-1.5 overflow-x-auto pb-1" aria-label={t.orders.filter}>
        {FILTERS.map((f) => (
          <Link
            key={f}
            href={f === "all" ? "/orders" : `/orders?status=${f}`}
            aria-current={f === filter ? "page" : undefined}
            className={clsx("shrink-0 rounded-full border px-3.5 py-1.5 text-[13px] font-medium", f === filter ? "border-accent bg-accent text-accent-fg" : "border-line bg-surface hover:bg-surface-2")}
          >
            {f === "all" ? t.catalog.all : f === "open" ? t.orders.open : t.orderStatus[f]}
          </Link>
        ))}
      </nav>

      {orders.length === 0 ? (
        <EmptyState Icon={ClipboardList} title={t.orders.empty} hint={isSeller ? t.orders.emptySeller : t.orders.emptyBuyer} />
      ) : (
        <ul className="flex flex-col gap-2.5">
          {orders.map((o) => (
            <li key={o.id}>
              <Link href={`/orders/${o.id}`} className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-xl border border-line bg-surface px-4 py-3.5 hover:border-muted/40">
                <span className="font-bold tabular-nums">№{o.number}</span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-semibold">{isSeller ? o.buyer.name : o.seller.name}</span>
                  <span className="block text-[13px] text-muted">
                    {formatDateTime(o.createdAt, locale)} · {o.items.length} {t.orders.items}
                  </span>
                </span>
                <span className="flex gap-1.5">
                  <StatusPill status={o.status} t={t} />
                  <PaymentPill status={o.paymentStatus} t={t} />
                </span>
                <span className="w-32 text-right font-bold tabular-nums">
                  {formatAmount(o.total)} {t.common.sum}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
