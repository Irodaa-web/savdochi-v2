import { CreditCard, LifeBuoy } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { PlanCards } from "@/components/plans/PlanCards";
import { PageTitle } from "@/components/ui/Card";
import { fmt, formatDateTime } from "@/i18n/format";
import { getDictionary, getLocale } from "@/i18n/server";
import { requireUser } from "@/lib/auth/guard";
import { daysLeft, PLANS } from "@/lib/plans";
import { planUsage } from "@/server/plans";

export const metadata = { title: "Tarif" };

/** Kompaniya egasi: joriy tarif, foydalanish va tariflar taqqoslanishi. Xodimlar bu sahifani ko'rmaydi. */
export default async function BillingPage() {
  const user = await requireUser("seller");
  if (user.staff) redirect("/");
  const locale = await getLocale();
  const t = getDictionary(locale);
  const p = t.plans;
  const usage = await planUsage(user.id);
  const spec = PLANS[user.plan];
  const left = daysLeft(user);
  const until = user.plan !== "free" && user.subscriptionUntil ? fmt(p.until, { date: formatDateTime(user.subscriptionUntil, locale, false) }) : user.plan !== "free" ? p.unlimited : null;
  // Chegara 0 (Bepulda xodim yo'q) — "0 / 0" va qizil chiziq o'rniga oddiy izoh.
  const of = (n: number, limit: number | null) => (limit === null ? fmt(p.ofUnlimited, { n }) : limit === 0 ? p.staffNone : fmt(p.of, { n, limit }));
  const meter = (n: number, limit: number) => Math.min(100, Math.round((n / limit) * 100));

  return (
    <section className="flex flex-col gap-5">
      <PageTitle lead={p.lead}>{p.title}</PageTitle>

      <div className="glass-card grid gap-5 rounded-2xl p-5 md:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
        <div className="flex flex-col gap-1">
          <span className="text-[12px] font-semibold tracking-wider text-muted uppercase">{p.current}</span>
          <span className="text-[24px] font-bold tracking-tight">{p.names[user.plan]}</span>
          {until && (
            <span className="text-[14px] text-muted">
              {until}
              {left !== null && ` · ${fmt(p.daysLeft, { n: left })}`}
            </span>
          )}
          {user.planTrial && left !== null && <span className="mt-1 text-[13px] text-amber-700 dark:text-amber-300">{fmt(p.trialBanner, { n: left })}</span>}
        </div>
        <div className="flex flex-col gap-3">
          <span className="text-[12px] font-semibold tracking-wider text-muted uppercase">{p.usage}</span>
          {(
            [
              [p.usageProducts, usage.products, spec.products],
              [p.usageStaff, usage.staff, spec.staff],
            ] as const
          ).map(([label, n, limit]) => (
            <div key={label} className="flex flex-col gap-1.5">
              <span className="flex justify-between gap-3 text-[14px]">
                <span>{label}</span>
                <span className={limit === 0 ? "text-muted" : "font-semibold tabular-nums"}>{of(n, limit)}</span>
              </span>
              {limit !== null && limit > 0 && (
                <span className="h-2 overflow-hidden rounded-full bg-surface-2" aria-hidden>
                  <span className={`block h-full rounded-full ${n < limit ? "bg-accent" : "bg-danger"}`} style={{ width: `${meter(n, limit)}%` }} />
                </span>
              )}
            </div>
          ))}
        </div>
      </div>

      <PlanCards t={t} current={user.plan} />

      <div className="glass-card flex flex-col gap-3 rounded-2xl p-5 sm:flex-row sm:items-start">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-accent-soft text-accent">
          <CreditCard size={19} aria-hidden />
        </span>
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <h2 className="font-semibold">{p.payTitle}</h2>
          <p className="text-[14px] text-muted">{p.payManual}</p>
          <Link href="/help" className="inline-flex w-fit items-center gap-1.5 text-[14px] font-semibold text-accent hover:underline">
            <LifeBuoy size={16} aria-hidden />
            {p.payRequest}
          </Link>
        </div>
      </div>
    </section>
  );
}
