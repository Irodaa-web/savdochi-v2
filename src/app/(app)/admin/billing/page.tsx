import { Wallet } from "lucide-react";
import Link from "next/link";
import { Chips, Pager } from "@/components/admin/Chips";
import { PageTitle, Pill, Stat } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { fmt, formatDateTime } from "@/i18n/format";
import { getDictionary, getLocale } from "@/i18n/server";
import { requireAdmin } from "@/lib/auth/guard";
import { formatAmount } from "@/lib/catalog";
import { formatPhone } from "@/lib/phone";
import type { PlanOrderStatus } from "@/models/PlanOrder";
import { billingSummary, listPlanOrders } from "@/server/billing";
import { DecidePlanRequest } from "./DecidePlanRequest";

export const metadata = { title: "To'lovlar" };

const FILTERS = ["pending", "paid", "rejected", "all"] as const;
type Filter = (typeof FILTERS)[number];

/** Administrator: tarif so'rovlari (tasdiqlash/rad etish), to'lovlar jurnali va daromad. Standart — kutilayotganlar. */
export default async function AdminBilling({ searchParams }: { searchParams: Promise<{ status?: string; page?: string }> }) {
  await requireAdmin();
  const locale = await getLocale();
  const t = getDictionary(locale);
  const b = t.billing;
  const sp = await searchParams;
  const filter: Filter = (FILTERS as readonly string[]).includes(sp.status ?? "") ? (sp.status as Filter) : "pending";
  const [summary, data] = await Promise.all([billingSummary(), listPlanOrders({ status: filter === "all" ? undefined : (filter as PlanOrderStatus), page: Number(sp.page) || 1 })]);
  const href = (f: Filter, page?: number) => `/admin/billing?status=${f}${page && page > 1 ? `&page=${page}` : ""}`;
  const label = { pending: b.filterPending, paid: b.filterPaid, rejected: b.filterRejected, all: b.filterAll } as const;
  const status = { paid: b.statusPaid, rejected: b.statusRejected, pending: b.statusPending, cancelled: b.statusCancelled } as const;
  const source = { request: b.sourceRequest, admin: b.sourceAdmin, referral: b.sourceReferral } as const;

  return (
    <section className="flex flex-col gap-4">
      <PageTitle lead={b.adminLead}>{b.adminTitle}</PageTitle>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <Stat label={b.statPending} value={summary.pending} tone={summary.pending ? "accent" : undefined} />
        <Stat label={b.statMonth} value={formatAmount(summary.month)} />
        <Stat label={b.stat30} value={formatAmount(summary.days30)} />
        <Stat label={b.statTotal} value={formatAmount(summary.total)} />
        <Stat label={b.statPaying} value={summary.payingCompanies} />
      </div>
      <Chips label={t.admin.status} items={FILTERS.map((f) => ({ href: href(f), label: label[f], active: filter === f, ...(f === "pending" ? { count: summary.pending } : {}) }))} />
      {data.items.length === 0 ? (
        <EmptyState Icon={Wallet} title={b.empty} />
      ) : (
        <ul className="glass-card flex flex-col divide-y divide-line rounded-2xl">
          {data.items.map((o) => (
            <li key={o.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3">
              <span className="min-w-0 flex-1">
                <span className="flex flex-wrap items-center gap-1.5">
                  <Link href={`/admin/users/${o.company.id}`} className="font-semibold hover:text-accent hover:underline">
                    {o.company.name}
                  </Link>
                  <Pill tone={o.status === "paid" ? "success" : o.status === "rejected" ? "danger" : "accent"}>{status[o.status]}</Pill>
                  <span className="text-[12px] text-muted">{source[o.source]}</span>
                </span>
                <span className="mt-0.5 block text-[13px] text-muted">
                  {t.plans.names[o.plan]} · {fmt(b.months, { n: o.months })} · {o.status === "paid" ? fmt(b.paid, { sum: formatAmount(o.paidAmount) }) : fmt(b.expected, { sum: formatAmount(o.amount) })}
                  {o.company.phone && ` · ${formatPhone(o.company.phone)}`} · {formatDateTime(o.decidedAt ?? o.createdAt, locale)}
                </span>
                {o.status === "rejected" && o.note && <span className="mt-1 block text-[13px] text-danger">{o.note}</span>}
              </span>
              {o.status === "pending" && <DecidePlanRequest id={o.id} plan={o.plan} months={o.months} amount={o.amount} />}
            </li>
          ))}
        </ul>
      )}
      <Pager page={data.page} pages={data.pages} href={(n) => href(filter, n)} prev={t.catalog.prev} next={t.catalog.next} />
    </section>
  );
}
