import { Crown } from "lucide-react";
import Link from "next/link";
import type { Dictionary } from "@/i18n/dictionaries/uz";
import { fmt } from "@/i18n/format";
import type { SessionUser } from "@/lib/auth/session";
import { daysLeft, PLAN_WARN_DAYS } from "@/lib/plans";

/** Kompaniya egasiga: Premium sinov muddati qancha qoldi yoki pullik tarif tugashiga oz qoldi. */
export function PlanBanner({ user, t }: { user: SessionUser; t: Dictionary }) {
  if (user.role !== "seller" || user.staff) return null;
  const left = daysLeft(user);
  if (left === null) return null;
  const text = user.planTrial ? fmt(t.plans.trialBanner, { n: left }) : left <= PLAN_WARN_DAYS ? fmt(t.plans.endingBanner, { plan: t.plans.names[user.plan], n: left }) : null;
  if (!text) return null;
  return (
    <div role="status" className="flex items-start gap-3 rounded-2xl bg-amber-50 px-4 py-3 ring-1 ring-amber-300/60 ring-inset dark:bg-amber-400/10 dark:ring-amber-300/25">
      <Crown size={18} className="mt-0.5 shrink-0 text-amber-600 dark:text-amber-300" aria-hidden />
      <p className="min-w-0 text-[13px] leading-relaxed">
        {text}{" "}
        <Link href="/billing" className="font-semibold text-accent hover:underline">
          {t.plans.lockedCta}
        </Link>
      </p>
    </div>
  );
}
