import clsx from "clsx";
import { Check, Crown, Minus } from "lucide-react";
import type { ReactNode } from "react";
import type { Dictionary } from "@/i18n/dictionaries/uz";
import { fmt } from "@/i18n/format";
import { formatAmount } from "@/lib/catalog";
import { PLAN_CODES, PLAN_FEATURES, planHas, PLANS, type PlanCode } from "@/lib/plans";

/**
 * Uchta tarif yonma-yon: narx, chegaralar va imkoniyatlar ro'yxati.
 * Tarif sahifasida (joriy tarif belgilanadi) va ochiq bosh sahifada ishlatiladi.
 */
export function PlanCards({ t, current, footer }: { t: Dictionary; current?: PlanCode; footer?: (plan: PlanCode) => ReactNode }) {
  const p = t.plans;
  return (
    <ul className="grid gap-4 md:grid-cols-3">
      {PLAN_CODES.map((code) => {
        const spec = PLANS[code];
        const top = code === "premium";
        const mine = current === code;
        return (
          <li
            key={code}
            className={clsx("glass-card relative flex flex-col gap-4 rounded-2xl p-5", top && "ring-2 ring-amber-400/70", mine && !top && "ring-2 ring-accent/60")}
          >
            <div className="flex items-center justify-between gap-2">
              <h3 className="flex items-center gap-1.5 text-[17px] font-semibold">
                {top && <Crown size={17} className="text-amber-500" aria-hidden />}
                {p.names[code]}
              </h3>
              {mine && <span className="rounded-full bg-accent-soft px-2.5 py-1 text-[12px] font-semibold text-accent">{p.yourPlan}</span>}
            </div>
            <p className="flex items-baseline gap-1.5">
              {spec.price === 0 ? (
                <span className="text-[28px] font-bold tracking-tight">{p.free}</span>
              ) : (
                <>
                  <span className="text-[28px] font-bold tracking-tight tabular-nums">{formatAmount(spec.price)}</span>
                  <span className="text-[13px] text-muted">{p.perMonth}</span>
                </>
              )}
            </p>
            <ul className="flex flex-1 flex-col gap-2 text-[14px]">
              <Line ok>{spec.products === null ? p.productsUnlimited : fmt(p.products, { n: spec.products })}</Line>
              <Line ok={spec.staff !== 0}>{spec.staff === null ? p.staffUnlimited : spec.staff === 0 ? p.staffNone : fmt(p.staff, { n: spec.staff })}</Line>
              <Line ok>{p.base}</Line>
              {PLAN_FEATURES.map((f) => (
                <Line key={f} ok={planHas(code, f)}>
                  {p.features[f]}
                </Line>
              ))}
            </ul>
            {footer?.(code)}
          </li>
        );
      })}
    </ul>
  );
}

function Line({ ok, children }: { ok: boolean; children: ReactNode }) {
  return (
    <li className={clsx("flex items-start gap-2", !ok && "text-muted")}>
      {ok ? <Check size={16} className="mt-0.5 shrink-0 text-success" aria-hidden /> : <Minus size={16} className="mt-0.5 shrink-0 text-muted" aria-hidden />}
      <span className={clsx(!ok && "line-through decoration-muted/50")}>{children}</span>
    </li>
  );
}
