import { ShieldAlert } from "lucide-react";
import { fmt } from "@/i18n/format";
import { getDictionary, getLocale } from "@/i18n/server";
import type { SessionUser } from "@/lib/auth/session";

/** Kirgandan keyingi birinchi ekran: ko'k gradient panel, suzuvchi shisha doiralar. */
export async function Welcome({ user }: { user: SessionUser }) {
  const t = getDictionary(await getLocale());
  return (
    <section className="flex flex-col gap-5">
      <div className="hero relative isolate overflow-hidden rounded-2xl px-6 py-7 shadow-[var(--c-shadow-lg)] sm:px-8 sm:py-8">
        <span aria-hidden className="orb -top-14 right-6 size-40" />
        <span aria-hidden className="orb top-10 right-40 hidden size-16 [animation-delay:-3s] sm:block" />
        <span aria-hidden className="orb right-[-28px] -bottom-12 size-28 [animation-delay:-6s]" />
        <p className="relative text-[12px] font-semibold tracking-wider text-header-muted uppercase">
          {t.roles[user.role]} · {t.regions[user.region]}
        </p>
        <h1 className="relative mt-1.5 text-2xl font-bold tracking-tight sm:text-[28px]">{fmt(t.home.greeting, { name: user.name })}</h1>
        <p className="relative mt-2 max-w-xl text-header-muted">{user.role === "buyer" ? t.home.buyerLead : t.home.sellerLead}</p>
      </div>
      {user.verification !== "verified" && (
        <div className="flex items-start gap-3 rounded-2xl bg-accent-soft/90 px-4 py-3.5 ring-1 ring-accent/20 ring-inset">
          <ShieldAlert size={18} className="mt-0.5 shrink-0 text-accent" aria-hidden />
          <p className="text-[13px] leading-relaxed">{t.home.verifyNote}</p>
        </div>
      )}
    </section>
  );
}
