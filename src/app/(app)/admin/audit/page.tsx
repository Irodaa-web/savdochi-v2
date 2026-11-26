import { ScrollText } from "lucide-react";
import Link from "next/link";
import { Chips, Pager } from "@/components/admin/Chips";
import { PageTitle } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import type { Dictionary } from "@/i18n/dictionaries/uz";
import { fmt, formatDateTime } from "@/i18n/format";
import { getDictionary, getLocale } from "@/i18n/server";
import { requireAdmin } from "@/lib/auth/guard";
import { AUDIT_KINDS, listAudit, type AuditKind, type AuditView } from "@/server/admin";

export const metadata = { title: "Jurnal" };

/** Administrator: muhim amallar jurnali — oddiy tilda, turkum bo'yicha filtr. */
export default async function AdminAudit({ searchParams }: { searchParams: Promise<{ kind?: string; page?: string }> }) {
  await requireAdmin();
  const locale = await getLocale();
  const t = getDictionary(locale);
  const sp = await searchParams;
  const kind = (AUDIT_KINDS as readonly string[]).includes(sp.kind ?? "") ? (sp.kind as AuditKind) : undefined;
  const data = await listAudit({ kind, page: Number(sp.page) || 1 });
  const href = (k?: AuditKind, page?: number) => {
    const p = new URLSearchParams();
    if (k) p.set("kind", k);
    if (page && page > 1) p.set("page", String(page));
    const s = p.toString();
    return s ? `/admin/audit?${s}` : "/admin/audit";
  };

  return (
    <section className="flex flex-col gap-4">
      <PageTitle lead={t.audit.lead}>{t.adminNav.audit}</PageTitle>
      <Chips
        label={t.audit.filter}
        items={[{ href: href(), label: t.catalog.all, active: !kind }, ...AUDIT_KINDS.map((k) => ({ href: href(k), label: t.audit.kinds[k], active: kind === k }))]}
      />
      {data.items.length === 0 ? (
        <EmptyState Icon={ScrollText} title={t.admin.noAudit} />
      ) : (
        <ol className="glass-card flex flex-col divide-y divide-line rounded-2xl">
          {data.items.map((r) => (
            <li key={r.id} className="flex flex-col gap-0.5 px-4 py-3 sm:flex-row sm:items-baseline sm:gap-4">
              <span className="w-36 shrink-0 text-[12px] text-muted tabular-nums">{formatDateTime(r.createdAt, locale)}</span>
              <span className="min-w-0 flex-1 text-[14px]">
                <b>{r.actor === "?" ? t.audit.unknownUser : r.actor || t.audit.system}</b> {describe(r, t)}
                {r.targetName && r.targetName === r.actor ? null : r.targetName && r.target.startsWith("user:") ? (
                  <>
                    {" — "}
                    <Link href={`/admin/users/${r.target.slice(5)}`} className="font-medium text-accent hover:underline">
                      {r.targetName}
                    </Link>
                  </>
                ) : r.targetName ? (
                  <> — {r.targetName}</>
                ) : null}
              </span>
            </li>
          ))}
        </ol>
      )}
      <Pager page={data.page} pages={data.pages} href={(p) => href(kind, p)} prev={t.catalog.prev} next={t.catalog.next} />
    </section>
  );
}

/** Amal kodini oddiy jumlaga aylantiradi; noma'lum kod — o'zi ko'rinadi. */
function describe(r: AuditView, t: Dictionary): string {
  const a = t.audit;
  const d = r.details;
  switch (r.action) {
    case "admin.user.update": {
      const parts: string[] = [];
      if (d.verification === "verified") parts.push(a.verified);
      if (d.verification === "rejected") parts.push(d.reason ? fmt(a.rejectedWith, { reason: String(d.reason) }) : a.rejected);
      if (d.verification === "pending" || d.verification === "unverified") parts.push(a.verificationReset);
      if (d.blocked === true) parts.push(a.blocked);
      if (d.blocked === false) parts.push(a.unblocked);
      if (d.extendMonths === -1) parts.push(a.subscriptionStopped);
      else if (typeof d.extendMonths === "number" && d.extendMonths > 0) parts.push(fmt(a.subscriptionExtended, { n: d.extendMonths }));
      if (d.hidden === true) parts.push(a.hidden);
      if (d.hidden === false) parts.push(a.shown);
      if (d.reactivate) parts.push(a.reactivated);
      return parts.join(", ") || a.userUpdated;
    }
    case "admin.ticket.answer":
      return a.ticketAnswered;
    case "admin.plan.approve":
      return `${a.planApprove}: ${t.plans.names[d.plan as "standard" | "premium"] ?? ""}, ${String(d.months ?? "")}`;
    case "admin.plan.reject":
      return `${a.planReject}${d.reason ? ` — ${String(d.reason)}` : ""}`;
    case "admin.product.hide":
      return fmt(a.productHidden, { name: String(d.name ?? ""), reason: String(d.reason ?? "—") });
    case "admin.product.show":
      return fmt(a.productShown, { name: String(d.name ?? "") });
    case "auth.password.change":
      return a.passwordChanged;
    case "staff.add":
      return fmt(a.staffAdded, { role: (t.staff.roles as Record<string, string>)[String(d.role)] ?? String(d.role ?? "") });
    case "staff.update":
      return d.blocked === true ? a.staffBlocked : d.blocked === false ? a.staffUnblocked : d.role ? fmt(a.staffRole, { role: (t.staff.roles as Record<string, string>)[String(d.role)] ?? String(d.role) }) : d.password ? a.staffPassword : a.staffUpdated;
    case "staff.remove":
      return a.staffRemoved;
    case "inactivity.deactivated":
      return fmt(a.deactivated, { n: Number(d.count ?? 0) });
    case "inactivity.reactivated":
      return a.selfReactivated;
    default:
      return r.action;
  }
}
