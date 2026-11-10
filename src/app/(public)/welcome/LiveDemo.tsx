import { Building2, CheckCircle2, PackageOpen, ShoppingBag, Store } from "lucide-react";
import type { Dictionary } from "@/i18n/dictionaries/uz";

/**
 * Hero o'ng tomonidagi "jonli" ko'rinish: kompaniya ↔ do'kon aloqasi (harakatlanuvchi chiziq)
 * va navbat bilan chiqadigan uchta voqea — buyurtma, to'lov, ombor. Faqat CSS animatsiya.
 */
export function LiveDemo({ l }: { l: Dictionary["landing"] }) {
  const toasts = [
    { Icon: ShoppingBag, title: l.toastOrder, sub: l.toastOrderSub, tone: "bg-accent text-accent-fg" },
    { Icon: CheckCircle2, title: l.toastPaid, sub: l.toastPaidSub, tone: "bg-success text-white" },
    { Icon: PackageOpen, title: l.toastStock, sub: l.toastStockSub, tone: "bg-[#c48a2c] text-white" },
  ];

  return (
    <div className="land-in relative mx-auto w-full max-w-[460px]" style={{ animationDelay: "350ms" }} aria-hidden>
      <div className="land-float rounded-2xl border border-white/10 bg-header-2/80 p-5 shadow-2xl backdrop-blur-sm">
        <div className="mb-5 flex items-center gap-2 text-[12px] font-semibold tracking-wider text-header-muted uppercase">
          <span className="relative flex size-2.5">
            <span className="land-ping absolute inline-flex size-full rounded-full bg-[#4ade80]" />
            <span className="relative inline-flex size-2.5 rounded-full bg-[#4ade80]" />
          </span>
          {l.live}
        </div>

        {/* Kompaniya ↔ do'kon: oraliqda harakatlanuvchi chiziq va ikki tomonga yuguradigan nuqtalar */}
        <div className="flex items-center">
          <Node Icon={Building2} label={l.company} />
          <div className="relative mx-2 h-10 flex-1">
            <svg className="absolute inset-0 size-full" preserveAspectRatio="none" fill="none">
              <line className="land-dash" x1="0" y1="50%" x2="100%" y2="50%" stroke="var(--c-accent)" strokeWidth="2" />
            </svg>
            <span className="land-travel absolute top-1/2 size-3 -translate-y-1/2 rounded-full bg-accent shadow-[0_0_12px_var(--c-accent)]" />
            <span className="land-travel-back absolute top-1/2 size-2 -translate-y-1/2 rounded-full bg-[#4ade80] shadow-[0_0_10px_#4ade80]" />
          </div>
          <Node Icon={Store} label={l.store} />
        </div>

        {/* Voqealar */}
        <div className="relative mt-5 h-[76px]">
          {toasts.map(({ Icon, title, sub, tone }, i) => (
            <div
              key={title}
              className="land-toast absolute inset-x-0 top-0 flex items-center gap-3 rounded-xl border border-white/10 bg-surface p-3 text-text shadow-lg"
              style={{ animationDelay: `${i * 3}s` }}
            >
              <span className={`flex size-10 shrink-0 items-center justify-center rounded-lg ${tone}`}>
                <Icon size={20} />
              </span>
              <span className="min-w-0">
                <b className="block truncate text-[14px]">{title}</b>
                <span className="block truncate text-[12px] text-muted">{sub}</span>
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function Node({ Icon, label }: { Icon: typeof Store; label: string }) {
  return (
    <div className="flex w-[120px] shrink-0 flex-col items-center gap-2 rounded-xl border border-white/10 bg-header px-3 py-4">
      <span className="flex size-11 items-center justify-center rounded-xl bg-accent text-accent-fg">
        <Icon size={22} />
      </span>
      <span className="text-[13px] font-semibold text-header-text">{label}</span>
    </div>
  );
}
