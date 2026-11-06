import { ShieldAlert } from "lucide-react";
import { fmt } from "@/i18n/format";
import { getDictionary, getLocale } from "@/i18n/server";
import type { SessionUser } from "@/lib/auth/session";

/** Kirgandan keyingi birinchi ekran (katalog/panel tayyor bo'lguncha). */
export async function Welcome({ user }: { user: SessionUser }) {
  const t = getDictionary(await getLocale());
  return (
    <section className="flex flex-col gap-5">
      <div className="rounded-xl bg-header px-6 py-7 text-header-text">
        <p className="text-[12px] font-semibold tracking-wider text-header-muted uppercase">
          {t.roles[user.role]} · {t.regions[user.region]}
        </p>
        <h1 className="mt-1.5 text-2xl font-bold tracking-tight">{fmt(t.home.greeting, { name: user.name })}</h1>
        <p className="mt-2 max-w-xl text-header-muted">{user.role === "buyer" ? t.home.buyerLead : t.home.sellerLead}</p>
      </div>
      {user.verification !== "verified" && (
        <div className="flex items-start gap-3 rounded-xl border border-line bg-accent-soft px-4 py-3.5">
          <ShieldAlert size={18} className="mt-0.5 shrink-0 text-accent" aria-hidden />
          <p className="text-[13px] leading-relaxed">{t.home.verifyNote}</p>
        </div>
      )}
    </section>
  );
}
