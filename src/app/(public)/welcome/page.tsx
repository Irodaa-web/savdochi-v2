import { Building2, Check, MessageSquare, Search, Send, ShoppingCart, Store, Wallet } from "lucide-react";
import Link from "next/link";
import { LanguageSwitch, ThemeToggle } from "@/components/Preferences";
import { Logo } from "@/components/ui/Logo";
import { getDictionary, getLocale } from "@/i18n/server";
import { DemoButtons } from "./DemoButtons";

export const metadata = {
  title: "Savdochi — ulgurji savdo platformasi",
  description: "Kompaniyalar va do‘konlar uchun B2B ulgurji savdo: katalog, hamkorlik, nasiya, buyurtmalar, qarz daftari va hisob-faktura.",
};

const STEP_ICONS = [Search, MessageSquare, ShoppingCart, Wallet];

/** Kirmagan mehmon uchun ochiq bosh sahifa. */
export default async function WelcomePage() {
  const t = getDictionary(await getLocale());
  const l = t.landing;
  const demo = process.env.DEMO_MODE === "1";

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="bg-header text-header-text">
        <div className="mx-auto flex w-full max-w-[1200px] items-center justify-between gap-3 px-4 py-4 sm:px-6">
          <Logo tone="light" />
          <div className="flex items-center gap-1">
            <LanguageSwitch />
            <ThemeToggle className="flex size-10 cursor-pointer items-center justify-center rounded-lg text-header-muted hover:text-header-text" />
            <Link href="/login" className="ml-1 hidden rounded-lg px-3 py-2 text-[14px] font-semibold hover:bg-white/10 sm:inline-flex">
              {l.login}
            </Link>
          </div>
        </div>

        <section className="mx-auto flex w-full max-w-[1200px] flex-col gap-6 px-4 pt-10 pb-16 sm:px-6 sm:pt-16 sm:pb-24">
          <span className="text-[12px] font-semibold tracking-wider text-header-muted uppercase">{l.eyebrow}</span>
          <h1 className="max-w-3xl text-[34px] leading-[1.1] font-bold tracking-tight sm:text-[52px]">{l.title}</h1>
          <p className="max-w-2xl text-[16px] text-header-muted sm:text-[18px]">{l.lead}</p>
          <div className="flex flex-wrap gap-3">
            <Link href="/register" className="inline-flex h-12 items-center rounded-lg bg-accent px-6 text-[15px] font-semibold text-accent-fg hover:opacity-90">
              {l.register}
            </Link>
            <Link href="/login" className="inline-flex h-12 items-center rounded-lg border border-white/20 px-6 text-[15px] font-semibold hover:bg-white/10">
              {l.login}
            </Link>
          </div>
          {demo && <DemoButtons />}
        </section>
      </header>

      <main className="mx-auto flex w-full max-w-[1200px] flex-col gap-16 px-4 py-14 sm:px-6">
        <section className="flex flex-col gap-6">
          <h2 className="text-2xl font-bold tracking-tight">{l.stepsTitle}</h2>
          <ol className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {l.steps.map((s, i) => {
              const Icon = STEP_ICONS[i] ?? Search;
              return (
                <li key={s.title} className="flex flex-col gap-2 rounded-xl border border-line bg-surface p-5">
                  <span className="flex items-center gap-2 text-[13px] font-semibold text-accent">
                    <span className="flex size-8 items-center justify-center rounded-lg bg-accent-soft">
                      <Icon size={16} aria-hidden />
                    </span>
                    {i + 1}
                  </span>
                  <h3 className="text-[17px] font-bold">{s.title}</h3>
                  <p className="text-[14px] text-muted">{s.text}</p>
                </li>
              );
            })}
          </ol>
        </section>

        <section className="grid gap-4 md:grid-cols-2">
          {[
            { Icon: Store, title: l.forBuyers, points: l.buyerPoints },
            { Icon: Building2, title: l.forSellers, points: l.sellerPoints },
          ].map(({ Icon, title, points }) => (
            <div key={title} className="flex flex-col gap-4 rounded-xl border border-line bg-surface p-6">
              <h2 className="flex items-center gap-2.5 text-xl font-bold">
                <Icon size={22} className="text-accent" aria-hidden />
                {title}
              </h2>
              <ul className="flex flex-col gap-3">
                {points.map((p) => (
                  <li key={p} className="flex items-start gap-3 text-[15px]">
                    <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-accent text-accent-fg">
                      <Check size={13} strokeWidth={3} aria-hidden />
                    </span>
                    {p}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </section>

        <p className="flex items-center gap-2.5 text-[15px] text-muted">
          <Send size={18} className="shrink-0 text-accent" aria-hidden />
          {l.telegram}
        </p>

        <section className="flex flex-col items-start gap-4 rounded-xl bg-header px-6 py-10 text-header-text sm:px-10">
          <h2 className="text-2xl font-bold tracking-tight">{l.ctaTitle}</h2>
          <p className="text-header-muted">{l.ctaText}</p>
          <Link href="/register" className="inline-flex h-12 items-center rounded-lg bg-accent px-6 text-[15px] font-semibold text-accent-fg hover:opacity-90">
            {l.register}
          </Link>
        </section>
      </main>

      <footer className="border-t border-line py-6 text-center text-[13px] text-muted">{t.common.tagline}</footer>
    </div>
  );
}
