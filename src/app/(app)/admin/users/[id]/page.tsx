import { ArrowLeft, ExternalLink, Package, ReceiptText, Settings2, UserRound, Users } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { StatusPill } from "@/components/orders/StatusPill";
import { PageTitle, Pill } from "@/components/ui/Card";
import { SideCard } from "@/components/ui/SideCard";
import { fmt, formatDateTime } from "@/i18n/format";
import { getDictionary, getLocale } from "@/i18n/server";
import { requireAdmin } from "@/lib/auth/guard";
import { formatAmount } from "@/lib/catalog";
import { formatPhone } from "@/lib/phone";
import { getUserDetail } from "@/server/admin";
import { UserStatusPills } from "../UserStatusPills";
import { UserActions } from "./UserActions";
import { Avatar } from "@/components/ui/Avatar";

/** Administrator: bitta foydalanuvchi — ma'lumotlari, faolligi va amallar. */
export default async function AdminUser({ params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin();
  const locale = await getLocale();
  const t = getDictionary(locale);
  const a = t.adminPanel;
  const u = await getUserDetail((await params).id);
  if (!u) notFound();
  const seller = u.role === "seller";
  const dash = (v: string) => v || "—";
  const staffRoles = t.staff.roles as Record<string, string>;

  const info: [string, string][] = [
    [t.auth.phone, formatPhone(u.phone)],
    [t.auth.region, t.regions[u.region]],
    [t.checkout.address, dash(u.profile.address)],
    [a.registeredAt, formatDateTime(u.createdAt, locale)],
    [a.lastActive, u.lastActiveAt ? formatDateTime(u.lastActiveAt, locale) : "—"],
    [a.telegram, u.telegram ? a.yes : a.no],
    ...(seller
      ? ([[t.plans.title, `${t.plans.names[u.plan]}${u.plan !== "free" ? ` · ${u.subscriptionUntil ? fmt(t.plans.until, { date: formatDateTime(u.subscriptionUntil, locale, false) }) : t.plans.unlimited}` : ""}`]] as [string, string][])
      : []),
  ];
  const stats: [string, string][] = [
    [a.statOrders, String(u.stats.orders)],
    [seller ? a.statSales : a.statSpend, `${formatAmount(u.stats.value)} ${t.common.sum}`],
    [seller ? a.statClients : a.statSuppliers, String(u.stats.partners)],
    ...(seller ? ([[a.statProducts, String(u.stats.products)], [a.statStaff, String(u.stats.staff)]] as [string, string][]) : []),
    [a.statTickets, String(u.stats.openTickets)],
  ];

  return (
    <section className="flex flex-col gap-5">
      <Link href="/admin/users" className="inline-flex w-fit items-center gap-1.5 text-muted hover:text-text">
        <ArrowLeft size={16} aria-hidden />
        {t.adminNav.users}
      </Link>
      <PageTitle
        lead={
          <span className="flex flex-wrap items-center gap-1.5">
            <Pill>{t.roles[u.role]}</Pill>
            <UserStatusPills u={u} t={t} />
          </span>
        }
        action={
          seller ? (
            <Link href={`/suppliers/${u.id}`} className="inline-flex h-10 items-center gap-1.5 rounded-xl border border-line bg-[var(--c-glass-strong)] px-3.5 text-[14px] font-semibold hover:border-accent/40 hover:text-accent">
              <ExternalLink size={15} aria-hidden />
              {a.publicPage}
            </Link>
          ) : undefined
        }
      >
        <span className="flex items-center gap-3">
          <Avatar name={u.name} src={u.logo} size="lg" />
          {u.name}
        </span>
      </PageTitle>

      {u.verification === "rejected" && u.verificationNote && <p className="rounded-xl border border-danger/30 bg-danger-soft/50 px-4 py-3 text-[14px]">{fmt(a.rejectedNote, { reason: u.verificationNote })}</p>}

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        {stats.map(([label, value]) => (
          <div key={label} className="glass-card flex flex-col gap-1 rounded-2xl p-4">
            <span className="text-[12px] font-semibold tracking-wide text-muted uppercase">{label}</span>
            <span className="text-[18px] leading-tight font-bold tabular-nums">{value}</span>
          </div>
        ))}
      </div>

      <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_400px]">
        <div className="flex flex-col gap-4">
          <SideCard Icon={UserRound} title={a.infoTitle}>
            <dl className="grid gap-x-6 gap-y-2.5 sm:grid-cols-2">
              {info.map(([k, v]) => (
                <div key={k}>
                  <dt className="text-[12px] text-muted">{k}</dt>
                  <dd className="font-medium break-words">{v}</dd>
                </div>
              ))}
            </dl>
            {u.profile.about && <p className="mt-3 rounded-lg bg-surface-2/60 p-3 text-[14px] whitespace-pre-line">{u.profile.about}</p>}
            {seller && (
              <>
                <h3 className="mt-4 mb-2 text-[13px] font-semibold">{t.profile.requisites}</h3>
                <dl className="grid gap-x-6 gap-y-2.5 sm:grid-cols-2">
                  {(
                    [
                      [t.profile.inn, u.profile.inn],
                      [t.profile.mfo, u.profile.mfo],
                      [t.profile.bankName, u.profile.bankName],
                      [t.profile.bankAccount, u.profile.bankAccount],
                    ] as [string, string][]
                  ).map(([k, v]) => (
                    <div key={k}>
                      <dt className="text-[12px] text-muted">{k}</dt>
                      <dd className="font-medium tabular-nums">{dash(v)}</dd>
                    </div>
                  ))}
                </dl>
              </>
            )}
          </SideCard>

          <SideCard Icon={ReceiptText} title={a.recentOrders}>
            {u.orders.length === 0 ? (
              <p className="text-muted">{a.noOrders}</p>
            ) : (
              <ul className="-mx-2 flex flex-col">
                {u.orders.map((o) => (
                  <li key={o.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-xl px-2 py-2">
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium">
                        №{o.number} · {o.party}
                      </span>
                      <span className="text-[12px] text-muted">{formatDateTime(o.createdAt, locale)}</span>
                    </span>
                    <StatusPill status={o.status} t={t} />
                    <b className="w-28 text-right tabular-nums">{formatAmount(o.total)}</b>
                  </li>
                ))}
              </ul>
            )}
          </SideCard>

          {seller && (
            <SideCard Icon={Package} title={a.productsTitle}>
              {u.products.length === 0 ? (
                <p className="text-muted">{a.noProducts}</p>
              ) : (
                <ul className="-mx-2 flex flex-col">
                  {u.products.map((p) => (
                    <li key={p.id}>
                      <Link href={`/catalog/${p.id}`} className="flex items-center gap-3 rounded-xl px-2 py-2 hover:bg-accent-soft/60">
                        <span className="min-w-0 flex-1 truncate font-medium">{p.name}</span>
                        {!p.active && <Pill>{a.archived}</Pill>}
                        <span className="text-[13px] text-muted tabular-nums">{fmt(a.stockN, { n: p.stock })}</span>
                        <b className="w-24 text-right tabular-nums">{formatAmount(p.price)}</b>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </SideCard>
          )}

          {seller && u.staff.length > 0 && (
            <SideCard Icon={Users} title={t.staff.title}>
              <ul className="flex flex-col gap-2">
                {u.staff.map((s) => (
                  <li key={s.phone} className="flex flex-wrap items-center gap-2 text-[14px]">
                    <b>{s.name}</b>
                    <Pill>{staffRoles[s.role] ?? s.role}</Pill>
                    {s.blocked && <Pill tone="danger">{t.admin.blocked}</Pill>}
                    <span className="text-muted">{formatPhone(s.phone)}</span>
                  </li>
                ))}
              </ul>
            </SideCard>
          )}
        </div>

        <aside className="lg:sticky lg:top-20">
          <SideCard Icon={Settings2} title={a.actionsTitle}>
            <UserActions id={u.id} role={u.role} verification={u.verification} blocked={u.blocked} inactive={u.inactive} hidden={u.hidden} protectedUser={u.isAdmin || u.id === admin.id} />
          </SideCard>
        </aside>
      </div>
    </section>
  );
}
