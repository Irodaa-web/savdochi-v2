import clsx from "clsx";
import { AlertTriangle, Plus, Warehouse } from "lucide-react";
import Link from "next/link";
import { PaymentPill, StatusPill } from "@/components/orders/StatusPill";
import { Welcome } from "@/components/Welcome";
import { Alert } from "@/components/ui/Alert";
import { Card, Stat } from "@/components/ui/Card";
import { LinkButton } from "@/components/ui/LinkButton";
import { fmt, formatDateTime } from "@/i18n/format";
import { getDictionary, getLocale } from "@/i18n/server";
import { requireUser } from "@/lib/auth/guard";
import { formatAmount } from "@/lib/catalog";
import { listOrders } from "@/server/orders";
import { listSellerProducts } from "@/server/products";
import { subscriptionActive } from "@/server/profile";
import { sellerReport } from "@/server/reports";
import { lowStockAcrossPartners } from "@/server/stock";

const PERIODS = [7, 30, 90] as const;

/** Kompaniya bosh sahifasi: e'tibor talab qiladigan ishlar va hisobot. */
export default async function DashboardPage({ searchParams }: { searchParams: Promise<{ days?: string }> }) {
  const user = await requireUser("seller");
  const locale = await getLocale();
  const t = getDictionary(locale);
  const daysParam = (await searchParams).days;
  const days = PERIODS.find((d) => String(d) === daysParam) ?? 30;
  const [products, report, open, partnerLow] = await Promise.all([listSellerProducts(user.id), sellerReport(user.id, days), listOrders(user, { status: "open", limit: 8 }), lowStockAcrossPartners(user.id)]);
  const lowOwn = products.filter((p) => p.stock < p.minOrder);
  const maxDaily = Math.max(1, ...report.daily.map((d) => d.value));

  return (
    <div className="flex flex-col gap-5">
      <Welcome user={user} />
      {!subscriptionActive(user.subscriptionUntil) && <Alert>{t.subscription.expiredNote}</Alert>}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-bold">{t.dashboard.report}</h2>
        <nav className="flex gap-1" aria-label={t.dashboard.period}>
          {PERIODS.map((d) => (
            <Link key={d} href={`/dashboard?days=${d}`} aria-current={d === days ? "page" : undefined} className={clsx("rounded-full border px-3 py-1 text-[13px] font-medium", d === days ? "border-accent bg-accent text-accent-fg" : "border-line bg-surface")}>
              {fmt(t.dashboard.days, { n: d })}
            </Link>
          ))}
        </nav>
      </div>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label={t.dashboard.orders} value={report.totalOrders} />
        <Stat label={t.dashboard.value} value={formatAmount(report.orderValue)} />
        <Stat label={t.dashboard.paid} value={formatAmount(report.paidValue)} tone="success" />
        <Stat label={t.dashboard.unpaid} value={formatAmount(report.unpaidValue)} tone={report.unpaidValue ? "danger" : undefined} />
      </div>

      {report.totalOrders > 0 && (
        <Card>
          <h3 className="mb-3 text-[14px] font-semibold">{t.dashboard.daily}</h3>
          <div className="flex h-32 items-end gap-1" role="img" aria-label={t.dashboard.daily}>
            {report.daily.map((d) => (
              <div key={d.day} title={`${d.day}: ${formatAmount(d.value)}`} className={clsx("min-w-0.5 flex-1 rounded-t", d.value ? "bg-accent" : "bg-surface-2")} style={{ height: `${d.value ? Math.max(4, (d.value / maxDaily) * 100) : 2}%` }} />
            ))}
          </div>
        </Card>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="flex flex-col gap-2.5">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">{t.dashboard.attention}</h3>
            <Link href="/orders?status=open" className="text-[13px] font-semibold text-accent hover:underline">
              {t.dashboard.all}
            </Link>
          </div>
          {open.length === 0 ? (
            <p className="text-[14px] text-muted">{t.dashboard.noOpen}</p>
          ) : (
            open.map((o) => (
              <Link key={o.id} href={`/orders/${o.id}`} className="flex flex-wrap items-center gap-2 rounded-lg px-2 py-2 hover:bg-surface-2">
                <b className="tabular-nums">№{o.number}</b>
                <span className="min-w-0 flex-1 truncate text-[14px]">{o.buyer.name}</span>
                <StatusPill status={o.status} t={t} />
                <PaymentPill status={o.paymentStatus} t={t} />
              </Link>
            ))
          )}
        </Card>

        <Card className="flex flex-col gap-2.5">
          <h3 className="flex items-center gap-2 font-semibold">
            <Warehouse size={18} aria-hidden />
            {t.dashboard.partnerStock}
          </h3>
          {partnerLow.length === 0 ? (
            <p className="text-[14px] text-muted">{t.dashboard.partnerStockEmpty}</p>
          ) : (
            partnerLow.map((p) => (
              <Link key={p.buyerId} href={`/partners/${p.buyerId}`} className="flex items-center justify-between gap-2 rounded-lg px-2 py-2 hover:bg-surface-2">
                <span className="truncate">{p.buyerName}</span>
                <span className="text-[13px] font-semibold text-danger">{fmt(t.stock.lowCount, { n: p.items })}</span>
              </Link>
            ))
          )}
        </Card>

        <Card className="flex flex-col gap-2">
          <h3 className="font-semibold">{t.dashboard.top}</h3>
          {report.topProducts.length === 0 ? (
            <p className="text-[14px] text-muted">—</p>
          ) : (
            report.topProducts.map((p) => (
              <div key={p.name} className="flex justify-between gap-2 text-[14px]">
                <span className="truncate">{p.name}</span>
                <b className="tabular-nums">{formatAmount(p.value)}</b>
              </div>
            ))
          )}
          <p className="mt-1 text-[13px] text-muted">{fmt(t.dashboard.repeat, { n: report.repeatPartners })}</p>
        </Card>

        <Card className="flex flex-col gap-2">
          <h3 className="font-semibold">{t.dashboard.inactive}</h3>
          {report.inactive.length === 0 ? (
            <p className="text-[14px] text-muted">{t.dashboard.inactiveEmpty}</p>
          ) : (
            report.inactive.map((p) => (
              <Link key={p.id} href={`/partners/${p.id}`} className="flex justify-between gap-2 rounded-lg px-2 py-1.5 text-[14px] hover:bg-surface-2">
                <span className="truncate">{p.name}</span>
                <span className="text-muted">{fmt(t.dashboard.daysAgo, { n: p.days })}</span>
              </Link>
            ))
          )}
        </Card>
      </div>

      <Card className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="font-semibold">{t.products.title}</h3>
          <p className="text-[14px] text-muted">
            {fmt(t.dashboard.productsLine, { n: products.length })}
            {lowOwn.length > 0 && (
              <span className="ml-2 inline-flex items-center gap-1 font-semibold text-danger">
                <AlertTriangle size={14} aria-hidden />
                {fmt(t.dashboard.ownLow, { n: lowOwn.length })}
              </span>
            )}
          </p>
        </div>
        <div className="flex gap-2">
          <LinkButton href="/products" variant="secondary">
            {t.dashboard.all}
          </LinkButton>
          <LinkButton href="/products/new">
            <Plus size={16} aria-hidden />
            {t.products.add}
          </LinkButton>
        </div>
      </Card>
      <p className="text-[12px] text-muted">{fmt(t.dashboard.updated, { time: formatDateTime(new Date(), locale) })}</p>
    </div>
  );
}
