import { Crown } from "lucide-react";
import Link from "next/link";
import type { Dictionary } from "@/i18n/dictionaries/uz";
import { fmt } from "@/i18n/format";
import { planFor, type PlanFeature } from "@/lib/plans";

/**
 * Tarifga kirmaydigan imkoniyat o'rnida: qaysi tarifda borligi va tariflar sahifasiga havola.
 * Xodim tarifni o'zgartira olmaydi — unga havola ko'rsatilmaydi (faqat izoh).
 */
export function PlanLocked({ feature, t, owner = true, compact = false }: { feature: PlanFeature; t: Dictionary; owner?: boolean; compact?: boolean }) {
  const p = t.plans;
  const plan = p.names[planFor(feature)];
  if (compact)
    return owner ? (
      <Link href="/billing" className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-amber-700 hover:underline dark:text-amber-300">
        <Crown size={14} aria-hidden />
        {fmt(p.lockedTitle, { plan })}
      </Link>
    ) : (
      <span className="inline-flex items-center gap-1.5 text-[13px] text-muted">
        <Crown size={14} aria-hidden />
        {fmt(p.lockedTitle, { plan })}
      </span>
    );
  return (
    <div className="glass-card flex flex-col items-start gap-3 rounded-2xl p-6">
      <span className="flex size-11 items-center justify-center rounded-xl bg-amber-100 text-amber-700 dark:bg-amber-400/15 dark:text-amber-300">
        <Crown size={20} aria-hidden />
      </span>
      <h2 className="text-[17px] font-semibold">{fmt(p.lockedTitle, { plan })}</h2>
      <p className="max-w-xl text-[14px] text-muted">
        {fmt(p.lockedText, { plan })} ({p.features[feature]})
      </p>
      {owner && (
        <Link href="/billing" className="inline-flex h-10 items-center rounded-xl bg-accent px-4 text-[14px] font-semibold text-accent-fg hover:opacity-90">
          {p.lockedCta}
        </Link>
      )}
    </div>
  );
}
