import clsx from "clsx";
import Link from "next/link";
import { ActionButton } from "@/components/ui/ActionButton";
import { Card, PageTitle, Pill, Stat } from "@/components/ui/Card";
import { formatDateTime } from "@/i18n/format";
import { getDictionary, getLocale } from "@/i18n/server";
import { requireAdmin } from "@/lib/auth/guard";
import { formatPhone } from "@/lib/phone";
import { adminStats, listAudit, listUsers } from "@/server/admin";
import { subscriptionActive } from "@/server/profile";
import { listAllTickets } from "@/server/tickets";
import { TicketReply } from "./TicketReply";

export const metadata = { title: "Administrator" };

const TABS = ["users", "tickets", "audit"] as const;
type Params = { tab?: string; q?: string; role?: string; v?: string };

export default async function AdminPage({ searchParams }: { searchParams: Promise<Params> }) {
  await requireAdmin();
  const locale = await getLocale();
  const t = getDictionary(locale);
  const sp = await searchParams;
  const tab = (TABS as readonly string[]).includes(sp.tab ?? "") ? (sp.tab as (typeof TABS)[number]) : "users";
  const stats = await adminStats();

  return (
    <section className="flex flex-col gap-5">
      <PageTitle>{t.admin.title}</PageTitle>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
        <Stat label={t.admin.sellers} value={stats.sellers} />
        <Stat label={t.admin.buyers} value={stats.buyers} />
        <Stat label={t.admin.pending} value={stats.pending} tone={stats.pending ? "accent" : undefined} />
        <Stat label={t.products.title} value={stats.products} />
        <Stat label={t.nav.orders} value={stats.orders} />
        <Stat label={t.admin.openTickets} value={stats.openTickets} tone={stats.openTickets ? "danger" : undefined} />
      </div>

      <nav className="flex gap-1 border-b border-line">
        {TABS.map((x) => (
          <Link key={x} href={`/admin?tab=${x}`} aria-current={x === tab ? "page" : undefined} className={clsx("-mb-px border-b-2 px-4 py-2.5 font-medium", x === tab ? "border-accent text-accent" : "border-transparent text-muted hover:text-text")}>
            {t.admin.tabs[x]}
          </Link>
        ))}
      </nav>

      {tab === "users" && <Users sp={sp} locale={locale} t={t} />}
      {tab === "tickets" && <Tickets locale={locale} t={t} />}
      {tab === "audit" && <Audit locale={locale} t={t} />}
    </section>
  );
}

type T = ReturnType<typeof getDictionary>;

async function Users({ sp, locale, t }: { sp: Params; locale: string; t: T }) {
  const users = await listUsers({
    q: sp.q,
    role: sp.role === "buyer" || sp.role === "seller" ? sp.role : undefined,
    verification: sp.v === "pending" ? "pending" : undefined,
  });
  return (
    <div className="flex flex-col gap-3">
      <form className="flex flex-wrap gap-2">
        <input type="hidden" name="tab" value="users" />
        <input name="q" defaultValue={sp.q} placeholder={t.admin.search} aria-label={t.admin.search} className="h-10 min-w-0 flex-1 rounded-lg border border-line bg-surface px-3 outline-none focus:border-accent" />
        <select name="role" defaultValue={sp.role ?? ""} aria-label={t.auth.roleLabel} className="h-10 rounded-lg border border-line bg-surface px-2">
          <option value="">{t.catalog.all}</option>
          <option value="seller">{t.roles.seller}</option>
          <option value="buyer">{t.roles.buyer}</option>
        </select>
        <label className="flex items-center gap-1.5 text-[14px]">
          <input type="checkbox" name="v" value="pending" defaultChecked={sp.v === "pending"} />
          {t.admin.onlyPending}
        </label>
        <button className="h-10 cursor-pointer rounded-lg bg-accent px-4 font-semibold text-accent-fg">{t.admin.find}</button>
      </form>

      {users.map((u) => (
        <Card key={u.id} className="flex flex-col gap-2.5">
          <div className="flex flex-wrap items-center gap-2">
            <b>{u.name}</b>
            <Pill>{t.roles[u.role]}</Pill>
            <Pill tone={u.verification === "verified" ? "success" : u.verification === "pending" ? "accent" : u.verification === "rejected" ? "danger" : "neutral"}>{t.admin.verification[u.verification]}</Pill>
            {u.blocked && <Pill tone="danger">{t.admin.blocked}</Pill>}
            {u.demo && <Pill>demo</Pill>}
          </div>
          <div className="text-[13px] text-muted">
            {formatPhone(u.phone)} · {t.regions[u.region]} · {formatDateTime(u.createdAt, locale, false)}
            {u.address && ` · ${u.address}`}
          </div>
          {u.role === "seller" && (
            <div className="text-[13px]">
              {t.subscription.title}:{" "}
              {u.subscriptionUntil ? (
                <span className={subscriptionActive(u.subscriptionUntil) ? "text-success" : "text-danger"}>{formatDateTime(u.subscriptionUntil, locale, false)}</span>
              ) : (
                <span className="text-success">{t.subscription.unlimited}</span>
              )}
            </div>
          )}
          <div className="flex flex-wrap gap-2">
            {u.verification !== "verified" && (
              <ActionButton path={`/api/v1/admin/users/${u.id}`} method="PATCH" body={{ verification: "verified" }}>
                {t.admin.verify}
              </ActionButton>
            )}
            {u.verification !== "rejected" && u.verification !== "verified" && (
              <ActionButton path={`/api/v1/admin/users/${u.id}`} method="PATCH" body={{ verification: "rejected" }} variant="secondary">
                {t.admin.rejectVerify}
              </ActionButton>
            )}
            {u.role === "seller" && (
              <>
                <ActionButton path={`/api/v1/admin/users/${u.id}`} method="PATCH" body={{ extendMonths: 1 }} variant="secondary">
                  {t.admin.extend1}
                </ActionButton>
                <ActionButton path={`/api/v1/admin/users/${u.id}`} method="PATCH" body={{ extendMonths: 12 }} variant="secondary">
                  {t.admin.extend12}
                </ActionButton>
              </>
            )}
            <ActionButton path={`/api/v1/admin/users/${u.id}`} method="PATCH" body={{ blocked: !u.blocked }} variant={u.blocked ? "secondary" : "ghost"} confirm={u.blocked ? undefined : t.admin.blockConfirm}>
              {u.blocked ? t.admin.unblock : t.admin.block}
            </ActionButton>
          </div>
        </Card>
      ))}
      {users.length === 0 && <p className="text-muted">{t.catalog.empty}</p>}
    </div>
  );
}

async function Tickets({ locale, t }: { locale: string; t: T }) {
  const tickets = await listAllTickets();
  if (!tickets.length) return <p className="text-muted">{t.admin.noTickets}</p>;
  return (
    <div className="flex flex-col gap-3">
      {tickets.map((tk) => (
        <Card key={tk.id} className="flex flex-col gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <b>{tk.subject}</b>
            <Pill tone={tk.status === "resolved" ? "success" : "accent"}>{t.ticketStatus[tk.status]}</Pill>
          </div>
          <span className="text-[13px] text-muted">
            {tk.user.name} · {formatDateTime(tk.createdAt, locale)}
          </span>
          <p className="text-[14px] whitespace-pre-line">{tk.message}</p>
          <TicketReply id={tk.id} status={tk.status} reply={tk.reply} />
        </Card>
      ))}
    </div>
  );
}

async function Audit({ locale, t }: { locale: string; t: T }) {
  const rows = await listAudit();
  if (!rows.length) return <p className="text-muted">{t.admin.noAudit}</p>;
  return (
    <div className="overflow-x-auto rounded-xl border border-line bg-surface">
      <table className="w-full min-w-[720px] border-collapse text-left text-[13px]">
        <tbody>
          {rows.map((r) => (
            <tr key={r.id} className="border-b border-line last:border-0">
              <td className="px-3 py-2 whitespace-nowrap text-muted">{formatDateTime(r.createdAt, locale)}</td>
              <td className="px-3 py-2">{r.actor}</td>
              <td className="px-3 py-2 font-mono">{r.action}</td>
              <td className="px-3 py-2 font-mono text-muted">{r.target}</td>
              <td className="px-3 py-2 font-mono break-all text-muted">{r.details}</td>
              <td className="px-3 py-2 text-muted">{r.ip}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
