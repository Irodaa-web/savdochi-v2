import { ChevronRight, Search } from "lucide-react";
import Link from "next/link";
import { Chips, Pager } from "@/components/admin/Chips";
import { PageTitle, Pill } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { fmt, formatDateTime } from "@/i18n/format";
import { getDictionary, getLocale } from "@/i18n/server";
import { requireAdmin } from "@/lib/auth/guard";
import { formatPhone } from "@/lib/phone";
import { listUsers, USER_STATUSES, type UserStatusFilter } from "@/server/admin";
import { subscriptionActive } from "@/server/profile";
import { UserStatusPills } from "./UserStatusPills";

export const metadata = { title: "Foydalanuvchilar" };

type Params = { q?: string; role?: string; status?: string; page?: string };

/** Administrator: foydalanuvchilar ro'yxati — qidiruv, rol va holat bo'yicha filtr, sahifalash. */
export default async function AdminUsers({ searchParams }: { searchParams: Promise<Params> }) {
  await requireAdmin();
  const locale = await getLocale();
  const t = getDictionary(locale);
  const a = t.adminPanel;
  const sp = await searchParams;
  const role = sp.role === "buyer" || sp.role === "seller" ? sp.role : undefined;
  const status = (USER_STATUSES as readonly string[]).includes(sp.status ?? "") ? (sp.status as UserStatusFilter) : undefined;
  const q = sp.q?.trim() || undefined;
  const data = await listUsers({ q, role, status, page: Number(sp.page) || 1 });

  const href = (patch: Partial<Params>) => {
    const p = new URLSearchParams();
    for (const [k, v] of Object.entries({ q, role, status, ...patch })) if (v) p.set(k, String(v));
    const s = p.toString();
    return s ? `/admin/users?${s}` : "/admin/users";
  };

  return (
    <section className="flex flex-col gap-4">
      <PageTitle lead={fmt(a.usersCount, { n: data.total })}>{t.adminNav.users}</PageTitle>
      <form action="/admin/users" className="flex flex-wrap gap-2">
        {role && <input type="hidden" name="role" value={role} />}
        {status && <input type="hidden" name="status" value={status} />}
        <label className="flex h-10 min-w-0 flex-1 items-center gap-2 rounded-xl border border-line bg-[var(--c-glass-strong)] px-3 text-muted focus-within:border-accent">
          <Search size={16} aria-hidden />
          <input name="q" type="search" defaultValue={q} placeholder={t.adminNav.searchUsers} aria-label={t.adminNav.searchUsers} className="focus-none min-w-0 flex-1 bg-transparent text-text outline-none" />
        </label>
        <button className="h-10 cursor-pointer rounded-xl bg-accent px-4 text-[14px] font-semibold text-accent-fg">{t.admin.find}</button>
      </form>
      <Chips
        label={a.filterRole}
        items={[
          { href: href({ role: undefined, page: undefined }), label: t.catalog.all, active: !role },
          { href: href({ role: "seller", page: undefined }), label: t.admin.sellers, active: role === "seller" },
          { href: href({ role: "buyer", page: undefined }), label: t.admin.buyers, active: role === "buyer" },
        ]}
      />
      <Chips
        label={a.filterStatus}
        items={[
          { href: href({ status: undefined, page: undefined }), label: a.statusAll, active: !status },
          ...USER_STATUSES.map((s) => ({ href: href({ status: s, page: undefined }), label: a.statuses[s], active: status === s })),
        ]}
      />

      {data.items.length === 0 ? (
        <EmptyState Icon={Search} title={a.usersEmpty} />
      ) : (
        <ul className="glass-card flex flex-col divide-y divide-line rounded-2xl">
          {data.items.map((u) => (
            <li key={u.id}>
              <Link href={`/admin/users/${u.id}`} className="group flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3 transition-colors hover:bg-accent-soft/40">
                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-center gap-1.5">
                    <b className="truncate">{u.name}</b>
                    <Pill>{t.roles[u.role]}</Pill>
                    <UserStatusPills u={u} t={t} />
                  </span>
                  <span className="mt-0.5 block text-[13px] text-muted">
                    {formatPhone(u.phone)} · {t.regions[u.region]} · {fmt(a.registered, { date: formatDateTime(u.createdAt, locale, false) })}
                    {u.lastActiveAt && ` · ${fmt(a.lastSeen, { date: formatDateTime(u.lastActiveAt, locale, false) })}`}
                  </span>
                </span>
                {u.role === "seller" && (
                  <span className="text-[12px] text-muted">
                    {t.subscription.title}:{" "}
                    {u.subscriptionUntil ? (
                      <b className={subscriptionActive(u.subscriptionUntil) ? "text-success" : "text-danger"}>{formatDateTime(u.subscriptionUntil, locale, false)}</b>
                    ) : (
                      <b className="text-success">{t.subscription.unlimited}</b>
                    )}
                  </span>
                )}
                <ChevronRight size={18} className="shrink-0 text-muted transition-transform group-hover:translate-x-0.5" aria-hidden />
              </Link>
            </li>
          ))}
        </ul>
      )}
      <Pager page={data.page} pages={data.pages} href={(p) => href({ page: String(p) })} prev={t.catalog.prev} next={t.catalog.next} />
    </section>
  );
}
