import clsx from "clsx";
import { AlertTriangle, BadgeCheck, CalendarClock, CheckCircle2, CircleAlert, FlaskConical, LifeBuoy, ServerCog, UserPlus, Wallet } from "lucide-react";
import Link from "next/link";
import { DailySalesChart } from "@/components/dashboard/DailySalesChart";
import { Card, PageTitle, Pill } from "@/components/ui/Card";
import { SideCard } from "@/components/ui/SideCard";
import { DemoLogin } from "@/components/admin/DemoLogin";
import { fmt, formatDateTime, formatDay } from "@/i18n/format";
import { getDictionary, getLocale } from "@/i18n/server";
import { requireAdmin } from "@/lib/auth/guard";
import { formatAmount } from "@/lib/catalog";
import { adminOverview } from "@/server/admin";

export const metadata = { title: "Administrator" };

/** Administrator bosh paneli: platforma holati, kutayotgan ishlar va tizim sozlamalari. */
export default async function AdminHome() {
  await requireAdmin();
  const locale = await getLocale();
  const t = getDictionary(locale);
  const a = t.adminPanel;
  const o = await adminOverview();
  const sum = (n: number) => formatAmount(n);
  const chart = o.trend.map((d) => ({ ...d, label: formatDay(d.day, locale, "short"), full: formatDay(d.day, locale, "long") }));

  const todo = [
    o.pending > 0 && { href: "/admin/users?status=pending", Icon: BadgeCheck, text: fmt(a.todoPending, { n: o.pending }) },
    o.planRequests > 0 && { href: "/admin/billing", Icon: Wallet, text: fmt(t.billing.todo, { n: o.planRequests }) },
    o.openTickets > 0 && { href: "/admin/tickets", Icon: LifeBuoy, text: fmt(a.todoTickets, { n: o.openTickets }) },
    o.expiring.length > 0 && { href: "/admin/users?role=seller", Icon: CalendarClock, text: fmt(a.todoExpiring, { n: o.expiring.length }) },
  ].filter(Boolean) as { href: string; Icon: typeof BadgeCheck; text: string }[];

  const system: { ok: boolean; title: string; text: string }[] = [
    { ok: o.system.telegram, title: a.sysTelegram, text: o.system.telegram ? a.sysTelegramOn : a.sysTelegramOff },
    { ok: o.system.sms, title: a.sysSms, text: o.system.sms ? a.sysSmsOn : a.sysSmsOff },
    { ok: o.system.cron, title: a.sysCron, text: o.system.cron ? a.sysCronOn : a.sysCronOff },
  ];

  return (
    <section className="flex flex-col gap-5">
      <PageTitle lead={a.homeLead}>{a.homeTitle}</PageTitle>

      {todo.length > 0 ? (
        <div className="grid gap-3 md:grid-cols-3">
          {todo.map(({ href, Icon, text }) => (
            <Link key={href} href={href} className="glass-card flex items-center gap-3 rounded-2xl border-accent/30 p-4 transition-all hover:-translate-y-0.5 hover:border-accent/50">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-accent-soft text-accent">
                <Icon size={19} aria-hidden />
              </span>
              <span className="text-[14px] font-semibold">{text}</span>
            </Link>
          ))}
        </div>
      ) : (
        <p className="flex items-center gap-2 rounded-xl border border-line bg-surface-2/50 px-4 py-3 text-[14px] text-muted">
          <CheckCircle2 size={17} className="text-success" aria-hidden />
          {a.todoNone}
        </p>
      )}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi label={t.admin.sellers} value={String(o.sellers)} hint={fmt(a.activeSellers, { n: o.activeSellers })} href="/admin/users?role=seller" />
        <Kpi label={t.admin.buyers} value={String(o.buyers)} hint={fmt(a.newUsers, { today: o.newToday, week: o.newWeek })} href="/admin/users?role=buyer" />
        <Kpi label={a.ordersToday} value={String(o.orders.today.n)} hint={`${sum(o.orders.today.value)} ${t.common.sum}`} />
        <Kpi label={a.ordersWeek} value={String(o.orders.week.n)} hint={`${sum(o.orders.week.value)} ${t.common.sum}`} />
        <Kpi label={a.ordersMonth} value={String(o.orders.month.n)} hint={`${sum(o.orders.month.value)} ${t.common.sum}`} />
        <Kpi label={a.products} value={String(o.activeProducts)} />
        <Kpi label={t.admin.blocked} value={String(o.blocked)} href="/admin/users?status=blocked" />
        <Kpi label={a.inactive} value={String(o.inactive)} hint={a.inactiveHint} href="/admin/users?status=inactive" />
      </div>

      <Card>
        <DailySalesChart days={chart} title={a.chartTitle} />
      </Card>

      <div className="grid items-start gap-4 lg:grid-cols-2">
        <SideCard Icon={CalendarClock} title={a.expiringTitle}>
          {o.expiring.length === 0 ? (
            <p className="text-muted">{a.expiringNone}</p>
          ) : (
            <ul className="-mx-2 flex flex-col">
              {o.expiring.map((u) => (
                <li key={u.id}>
                  <Link href={`/admin/users/${u.id}`} className="flex items-center justify-between gap-3 rounded-xl px-2 py-2 hover:bg-accent-soft/60">
                    <span className="truncate font-medium">{u.name}</span>
                    <span className="shrink-0 text-[13px] text-danger">{formatDateTime(u.until, locale, false)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
          {o.expired > 0 && <p className="mt-2 text-[13px] text-muted">{fmt(a.expiredCount, { n: o.expired })}</p>}
        </SideCard>
        <SideCard Icon={UserPlus} title={a.recentTitle} action={<Link href="/admin/users" className="text-[13px] font-semibold text-accent hover:underline">{a.all}</Link>}>
          <ul className="-mx-2 flex flex-col">
            {o.recentUsers.map((u) => (
              <li key={u.id}>
                <Link href={`/admin/users/${u.id}`} className="flex items-center gap-3 rounded-xl px-2 py-2 hover:bg-accent-soft/60">
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium">{u.name}</span>
                    <span className="text-[12px] text-muted">
                      {t.roles[u.role]} · {formatDateTime(u.createdAt, locale)}
                    </span>
                  </span>
                  <Pill tone={u.verification === "verified" ? "success" : u.verification === "pending" ? "accent" : u.verification === "rejected" ? "danger" : "neutral"}>{t.admin.verification[u.verification]}</Pill>
                </Link>
              </li>
            ))}
          </ul>
        </SideCard>
      </div>

      <SideCard Icon={FlaskConical} title={a.demoTitle}>
        <DemoLogin />
      </SideCard>

      <SideCard Icon={ServerCog} title={a.systemTitle}>
        <ul className="grid gap-3 md:grid-cols-2">
          {system.map((s) => (
            <li key={s.title} className={clsx("flex gap-3 rounded-xl border p-3", s.ok ? "border-line bg-surface-2/40" : "border-danger/30 bg-danger-soft/40")}>
              {s.ok ? <CheckCircle2 size={18} className="mt-0.5 shrink-0 text-success" aria-hidden /> : <AlertTriangle size={18} className="mt-0.5 shrink-0 text-danger" aria-hidden />}
              <span>
                <span className="block text-[14px] font-semibold">{s.title}</span>
                <span className="block text-[13px] text-muted">{s.text}</span>
              </span>
            </li>
          ))}
        </ul>
        <p className="mt-3 flex items-start gap-2 text-[12px] text-muted">
          <CircleAlert size={14} className="mt-0.5 shrink-0" aria-hidden />
          {fmt(a.sysAdmins, { n: o.system.admins })}
        </p>
      </SideCard>
    </section>
  );
}

function Kpi({ label, value, hint, href }: { label: string; value: string; hint?: string; href?: string }) {
  const body = (
    <>
      <span className="text-[12px] font-semibold tracking-wide text-muted uppercase">{label}</span>
      <span className="text-[22px] leading-tight font-bold tabular-nums">{value}</span>
      {hint && <span className="text-[12px] text-muted">{hint}</span>}
    </>
  );
  const cls = "glass-card flex flex-col gap-1 rounded-2xl p-4";
  return href ? (
    <Link href={href} className={clsx(cls, "transition-all hover:-translate-y-0.5 hover:border-accent/40")}>
      {body}
    </Link>
  ) : (
    <div className={cls}>{body}</div>
  );
}
