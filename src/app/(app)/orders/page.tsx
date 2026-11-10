import clsx from "clsx";
import { ClipboardList, Search } from "lucide-react";
import Link from "next/link";
import { PaymentPill, StatusPill } from "@/components/orders/StatusPill";
import { PageTitle, Pill } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatDateTime } from "@/i18n/format";
import { getDictionary, getLocale } from "@/i18n/server";
import { requireUser } from "@/lib/auth/guard";
import { formatAmount } from "@/lib/catalog";
import { ORDER_STATUSES, type OrderStatus } from "@/lib/orders";
import { listOrders } from "@/server/orders";

export const metadata = { title: "Buyurtmalar" };

const FILTERS = ["all", "open", ...ORDER_STATUSES] as const;

export default async function OrdersPage({ searchParams }: { searchParams: Promise<{ status?: string; q?: string }> }) {
  const user = await requireUser();
  const locale = await getLocale();
  const t = getDictionary(locale);
  const sp = await searchParams;
  const raw = sp.status ?? "all";
  const filter = (FILTERS as readonly string[]).includes(raw) ? raw : "all";
  const q = (sp.q ?? "").trim().slice(0, 60);
  const orders = await listOrders(user, { status: filter === "all" ? undefined : (filter as OrderStatus | "open"), q: q || undefined });
  const href = (f: string) => {
    const params = new URLSearchParams();
    if (f !== "all") params.set("status", f);
    if (q) params.set("q", q);
    const s = params.toString();
    return s ? `/orders?${s}` : "/orders";
  };
  const isSeller = user.role === "seller";

  return (
    <section className="flex flex-col gap-5">
      <PageTitle
        action={
          <form method="get" role="search" className="flex w-full gap-2 sm:w-auto">
            {filter !== "all" && <input type="hidden" name="status" value={filter} />}
            <label className="relative flex-1 sm:w-72">
              <span className="sr-only">{t.orders.searchPlaceholder}</span>
              <Search size={16} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted" aria-hidden />
              <input name="q" type="search" defaultValue={q} placeholder={t.orders.searchPlaceholder} className="h-10 w-full rounded-lg border border-line bg-surface pr-3 pl-9 text-[14px]" />
            </label>
            <button type="submit" className="h-10 cursor-pointer rounded-lg border border-line bg-surface px-4 text-[14px] font-semibold hover:bg-surface-2">
              {t.orders.search}
            </button>
          </form>
        }
      >
        {t.nav.orders}
      </PageTitle>
      <nav className="flex gap-1.5 overflow-x-auto pb-1" aria-label={t.orders.filter}>
        {FILTERS.map((f) => (
          <Link
            key={f}
            href={href(f)}
            aria-current={f === filter ? "page" : undefined}
            className={clsx("shrink-0 rounded-full border px-3.5 py-1.5 text-[13px] font-medium", f === filter ? "border-accent bg-accent text-accent-fg" : "border-line bg-surface hover:bg-surface-2")}
          >
            {f === "all" ? t.catalog.all : f === "open" ? t.orders.open : t.orderStatus[f]}
          </Link>
        ))}
      </nav>

      {orders.length === 0 ? (
        q ? (
          <EmptyState Icon={Search} title={t.orders.notFound} hint={t.orders.searchPlaceholder} />
        ) : (
          <EmptyState Icon={ClipboardList} title={t.orders.empty} hint={isSeller ? t.orders.emptySeller : t.orders.emptyBuyer} />
        )
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
                  {o.creditApproval === "pending" && o.status === "new" && <Pill tone="accent">{t.orders.creditPill}</Pill>}
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
