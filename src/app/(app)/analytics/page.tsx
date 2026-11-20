import clsx from "clsx";
import { CalendarRange, Clock, Gauge, Layers, PackageX, Store, Truck, Users } from "lucide-react";
import Link from "next/link";
import { BarList } from "@/components/analytics/BarList";
import { DeltaStat } from "@/components/analytics/DeltaStat";
import { DailySalesChart } from "@/components/dashboard/DailySalesChart";
import { Card, PageTitle } from "@/components/ui/Card";
import { SideCard } from "@/components/ui/SideCard";
import type { Dictionary } from "@/i18n/dictionaries/uz";
import { fmt, formatDateTime, formatDay, formatMonth } from "@/i18n/format";
import { getDictionary, getLocale } from "@/i18n/server";
import { requireUser } from "@/lib/auth/guard";
import { formatAmount } from "@/lib/catalog";
import { buyerAnalytics, change, PERIODS, periodOf, sellerAnalytics, type Period, type TrendPoint } from "@/server/analytics";

export const metadata = { title: "Analitika" };

/**
 * Analitika: kompaniya uchun — savdo, mijozlar, kategoriyalar, hafta kunlari, bajarish tezligi;
 * do'kon uchun — xarajatlar, yetkazib beruvchilar, kategoriyalar. Har ko'rsatkich oldingi teng davr bilan.
 */
export default async function AnalyticsPage({ searchParams }: { searchParams: Promise<{ period?: string }> }) {
  const user = await requireUser(undefined, { staff: ["manager"] });
  const locale = await getLocale();
  const t = getDictionary(locale);
  const period = periodOf((await searchParams).period);
  const a = t.analytics;

  const labelTrend = (points: TrendPoint[], monthly: boolean) =>
    points.map((p) =>
      monthly ? { ...p, label: formatMonth(p.day, locale, "short"), full: formatMonth(p.day, locale, "long") } : { ...p, label: formatDay(p.day, locale, "short"), full: formatDay(p.day, locale, "long") },
    );
  const sum = (n: number) => `${formatAmount(n)} ${t.common.sum}`;
  const versus = period === 365 ? a.vsPrevYear : fmt(a.vsPrev, { n: period });

  const header = (
    <>
      <PageTitle lead={user.role === "seller" ? a.leadSeller : a.leadBuyer}>{user.role === "seller" ? a.titleSeller : a.titleBuyer}</PageTitle>
      <PeriodSwitch period={period} t={t} />
    </>
  );

  if (user.role === "buyer") {
    const r = await buyerAnalytics(user.id, period);
    const avg = (x: { value: number; orders: number }) => (x.orders ? x.value / x.orders : 0);
    return (
      <section className="flex flex-col gap-5">
        {header}
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <DeltaStat label={`${a.spend}, ${t.common.sum}`} value={formatAmount(r.current.value)} delta={change(r.current.value, r.previous.value)} upIsGood={false} versus={versus} />
          <DeltaStat label={a.orders} value={String(r.current.orders)} delta={change(r.current.orders, r.previous.orders)} versus={versus} />
          <DeltaStat label={`${a.avgOrder}, ${t.common.sum}`} value={formatAmount(avg(r.current))} delta={change(avg(r.current), avg(r.previous))} versus={versus} />
          <DeltaStat label={`${a.saved}, ${t.common.sum}`} value={formatAmount(r.saved)} delta={change(r.current.discount, r.previous.discount)} versus={versus} hint={a.savedHint} />
        </div>
        <Card>
          <DailySalesChart key={period} days={labelTrend(r.trend, r.monthly)} title={r.monthly ? a.spendMonthly : a.spendDaily} avgTemplate={r.monthly ? a.avgMonth : a.avgDay} />
        </Card>
        <div className="grid items-start gap-4 lg:grid-cols-2">
          <SideCard Icon={Store} title={a.bySupplier}>
            <BarList
              label={a.bySupplier}
              empty={a.empty}
              total={r.current.value}
              rows={r.suppliers.map((s) => ({ key: s.id, label: s.name, sub: fmt(a.ordersN, { n: s.orders }), value: s.value, display: formatAmount(s.value), href: `/suppliers/${s.id}` }))}
            />
          </SideCard>
          <SideCard Icon={Layers} title={a.byCategory}>
            <BarList label={a.byCategory} empty={a.empty} rows={r.categories.map((c) => ({ key: c.category, label: t.categories[c.category], value: c.value, display: formatAmount(c.value) }))} />
          </SideCard>
        </div>
        <SideCard Icon={CalendarRange} title={a.topBought}>
          <BarList
            label={a.topBought}
            empty={a.empty}
            total={r.current.value}
            rows={r.products.map((p) => ({ key: p.name, label: p.name, sub: `${formatAmount(p.quantity)} ${(t.units as Record<string, string>)[p.unit] ?? p.unit}`, value: p.value, display: formatAmount(p.value) }))}
          />
        </SideCard>
      </section>
    );
  }

  const r = await sellerAnalytics(user.id, period);
  const avg = (x: { value: number; orders: number }) => (x.orders ? x.value / x.orders : 0);
  const rate = (part: number, all: number) => (all ? Math.round((part / all) * 100) : 0);
  const cancelRate = (x: typeof r.current) => rate(x.cancelled, x.orders + x.cancelled);
  const collected = (x: typeof r.current) => rate(x.paid, x.value);
  const maxWeek = Math.max(...r.weekdays.map((w) => w.value), 1);
  const best = r.weekdays.reduce((b, w) => (w.value > b.value ? w : b), r.weekdays[0]!);
  const duration = (h: number | null) => (h == null ? "—" : h < 48 ? fmt(a.hours, { n: Math.round(h) }) : fmt(a.days, { n: Math.round((h / 24) * 10) / 10 }));

  return (
    <section className="flex flex-col gap-5">
      {header}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        <DeltaStat label={`${a.revenue}, ${t.common.sum}`} value={formatAmount(r.current.value)} delta={change(r.current.value, r.previous.value)} versus={versus} />
        <DeltaStat label={a.orders} value={String(r.current.orders)} delta={change(r.current.orders, r.previous.orders)} versus={versus} />
        <DeltaStat label={`${a.avgOrder}, ${t.common.sum}`} value={formatAmount(avg(r.current))} delta={change(avg(r.current), avg(r.previous))} versus={versus} />
        <DeltaStat label={a.activeClients} value={String(r.current.buyers)} delta={change(r.current.buyers, r.previous.buyers)} versus={versus} hint={fmt(a.newClients, { n: r.newClients })} />
        <DeltaStat label={a.collected} value={`${collected(r.current)}%`} delta={r.previous.orders ? collected(r.current) - collected(r.previous) : null} unit={a.pp} versus={versus} hint={fmt(a.unpaid, { sum: formatAmount(r.current.value - r.current.paid) })} />
        <DeltaStat label={a.cancelRate} value={`${cancelRate(r.current)}%`} delta={r.previous.orders + r.previous.cancelled ? cancelRate(r.current) - cancelRate(r.previous) : null} unit={a.pp} upIsGood={false} versus={versus} />
      </div>

      <Card>
        <DailySalesChart key={period} days={labelTrend(r.trend, r.monthly)} title={r.monthly ? a.salesMonthly : undefined} avgTemplate={r.monthly ? a.avgMonth : undefined} />
      </Card>

      <div className="grid items-start gap-4 lg:grid-cols-2">
        <SideCard Icon={Users} title={a.topClients} action={<Link href="/partners" className="text-[13px] font-semibold text-accent hover:underline">{a.all}</Link>}>
          <BarList
            label={a.topClients}
            empty={a.empty}
            total={r.current.value}
            rows={r.clients.map((c) => ({
              key: c.id,
              label: c.name,
              sub: `${fmt(a.ordersN, { n: c.orders })} · ${fmt(a.lastOrder, { date: formatDateTime(c.last, locale, false) })}`,
              value: c.value,
              display: formatAmount(c.value),
              href: `/partners/${c.id}`,
            }))}
          />
        </SideCard>
        <SideCard Icon={Layers} title={a.byCategory}>
          <BarList label={a.byCategory} empty={a.empty} rows={r.categories.map((c) => ({ key: c.category, label: t.categories[c.category], sub: `${formatAmount(c.quantity)} ${a.units}`, value: c.value, display: formatAmount(c.value) }))} />
        </SideCard>
      </div>

      <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <SideCard Icon={CalendarRange} title={a.byWeekday}>
          {r.current.orders === 0 ? (
            <p className="text-[13px] text-muted">{a.empty}</p>
          ) : (
            <>
              <p className="-mt-1 mb-3 text-[13px] text-muted">{fmt(a.bestDay, { day: t.delivery.weekdaysLong[best.day - 1]! })}</p>
              {/* 7 ta ustun: qiymat matni ustun ostida, ustiga olib borilsa — to'liq ma'lumot. */}
              <ul className="grid h-40 grid-cols-7 items-end gap-2" aria-label={a.byWeekday}>
                {r.weekdays.map((w) => (
                  <li key={w.day} className="group relative flex h-full flex-col items-center justify-end gap-1.5" title={`${t.delivery.weekdaysLong[w.day - 1]}: ${sum(w.value)} · ${fmt(a.ordersN, { n: w.orders })}`}>
                    <span className="text-[11px] font-semibold text-muted tabular-nums opacity-0 transition-opacity group-hover:opacity-100">{w.orders}</span>
                    <span
                      className={clsx("w-full max-w-6 rounded-t-[4px] transition-colors", w.day === best.day ? "bg-[var(--c-chart)]" : "bg-[var(--c-chart)]/45 group-hover:bg-[var(--c-chart)]/70")}
                      style={{ height: `${Math.max(3, (w.value / maxWeek) * 100)}%` }}
                    />
                    <span className={clsx("text-[12px]", w.day === best.day ? "font-semibold" : "text-muted")}>{t.weekdays[w.day - 1]}</span>
                    <span className="sr-only">
                      {sum(w.value)}, {fmt(a.ordersN, { n: w.orders })}
                    </span>
                  </li>
                ))}
              </ul>
            </>
          )}
        </SideCard>
        <SideCard Icon={Gauge} title={a.speedTitle}>
          <dl className="grid grid-cols-2 gap-3">
            <div className="rounded-xl bg-surface-2/60 p-3">
              <dt className="flex items-center gap-1.5 text-[12px] text-muted">
                <Clock size={14} aria-hidden />
                {a.toConfirm}
              </dt>
              <dd className="mt-1 text-[18px] font-bold tabular-nums">{duration(r.speed.confirmHours)}</dd>
            </div>
            <div className="rounded-xl bg-surface-2/60 p-3">
              <dt className="flex items-center gap-1.5 text-[12px] text-muted">
                <Truck size={14} aria-hidden />
                {a.toDeliver}
              </dt>
              <dd className="mt-1 text-[18px] font-bold tabular-nums">{duration(r.speed.deliverHours)}</dd>
            </div>
          </dl>
          <p className="mt-3 text-[13px] text-muted">{a.speedHint}</p>
        </SideCard>
      </div>

      <SideCard Icon={PackageX} title={a.unsoldTitle}>
        {r.unsold.length === 0 ? (
          <p className="text-[13px] text-muted">{a.unsoldNone}</p>
        ) : (
          <>
            <p className="-mt-1 mb-3 text-[13px] text-muted">{a.unsoldHint}</p>
            <ul className="flex flex-wrap gap-2">
              {r.unsold.map((p) => (
                <li key={p.id}>
                  <Link href={`/products/${p.id}/edit`} className="inline-flex items-center gap-1.5 rounded-full border border-line bg-[var(--c-glass-strong)] px-3 py-1.5 text-[13px] hover:border-accent/40 hover:text-accent">
                    {p.name}
                    <span className="text-[12px] text-muted tabular-nums">
                      · {p.stock} {(t.units as Record<string, string>)[p.unit] ?? p.unit}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </>
        )}
      </SideCard>
    </section>
  );
}

/** Davr tanlash: 7 / 30 / 90 kun / 12 oy — diagrammalar ustida bitta qatorda. */
function PeriodSwitch({ period, t }: { period: Period; t: Dictionary }) {
  return (
    <nav aria-label={t.analytics.period} className="flex flex-wrap gap-2">
      {PERIODS.map((p) => (
        <Link
          key={p}
          href={p === 30 ? "/analytics" : `/analytics?period=${p}`}
          aria-current={p === period ? "page" : undefined}
          className={clsx(
            "inline-flex h-9 items-center rounded-full border px-4 text-[13px] font-semibold transition-colors",
            p === period ? "border-accent bg-accent text-accent-fg shadow-[var(--c-glow)]" : "border-line bg-[var(--c-glass-strong)] hover:border-accent/40 hover:text-accent",
          )}
        >
          {p === 365 ? t.analytics.year : fmt(t.analytics.daysN, { n: p })}
        </Link>
      ))}
    </nav>
  );
}
