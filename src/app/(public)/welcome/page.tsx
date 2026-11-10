import { ArrowRight, Bell, Boxes, Building2, Check, CreditCard, FileText, MessageSquare, Search, ShoppingCart, Store, Wallet } from "lucide-react";
import Link from "next/link";
import { LanguageSwitch, ThemeToggle } from "@/components/Preferences";
import { Logo } from "@/components/ui/Logo";
import { getDictionary, getLocale } from "@/i18n/server";
import { DemoButtons } from "./DemoButtons";
import { LiveDemo } from "./LiveDemo";
import { Reveal } from "./Reveal";

export const metadata = {
  title: "Savdochi — ulgurji savdo platformasi",
  description: "Kompaniyalar va do‘konlar uchun B2B ulgurji savdo: katalog, hamkorlik, nasiya, onlayn to‘lov, qarz daftari va hisob-faktura.",
};

const STEP_ICONS = [Search, MessageSquare, ShoppingCart, Wallet];
const FEATURE_ICONS = [Wallet, CreditCard, Boxes, FileText, Bell, MessageSquare];

/*
 * JS bor bo'lsa — paydo bo'ladigan bloklar dastlab yashirin (birinchi chizishdayoq, miltillamasin).
 * Gidratatsiya biror sababdan ishlamasa — 2,5 s dan keyin hammasi ko'rsatiladi.
 */
const REVEAL_BOOT = `document.documentElement.classList.add("reveal-on");setTimeout(function(){if(!window.__revealReady){document.querySelectorAll("[data-reveal]").forEach(function(e){e.setAttribute("data-shown","")})}},2500);`;

/** Kirmagan mehmon uchun ochiq bosh sahifa ("/" shu yerga yo'naltiradi). */
export default async function WelcomePage() {
  const t = getDictionary(await getLocale());
  const l = t.landing;
  const demo = process.env.DEMO_MODE === "1";
  const delay = (i: number) => ({ "--reveal-delay": `${i * 90}ms` }) as React.CSSProperties;

  return (
    <div className="flex min-h-dvh flex-col overflow-x-clip">
      <script dangerouslySetInnerHTML={{ __html: REVEAL_BOOT }} />
      <Reveal />

      {/* ---------------- Hero ---------------- */}
      <header className="relative isolate overflow-hidden bg-header text-header-text">
        <div className="pointer-events-none absolute inset-0 -z-10" aria-hidden>
          <div className="land-blob absolute -top-32 -left-24 size-[420px] rounded-full bg-accent/35 blur-3xl" />
          <div className="land-blob absolute -right-20 bottom-[-140px] size-[380px] rounded-full bg-[#c48a2c]/25 blur-3xl" style={{ animationDelay: "-7s" }} />
          <div className="absolute inset-0 bg-[radial-gradient(rgb(255_255_255/0.07)_1px,transparent_1px)] [background-size:22px_22px]" />
        </div>

        <nav className="mx-auto flex w-full max-w-[1200px] items-center justify-between gap-3 px-4 py-4 sm:px-6">
          <Logo tone="light" />
          <div className="flex items-center gap-1">
            <a href="#how" className="hidden rounded-lg px-3 py-2 text-[14px] text-header-muted hover:text-header-text md:inline-flex">
              {l.navHow}
            </a>
            <a href="#features" className="hidden rounded-lg px-3 py-2 text-[14px] text-header-muted hover:text-header-text md:inline-flex">
              {l.navFeatures}
            </a>
            <LanguageSwitch />
            <ThemeToggle className="flex size-10 cursor-pointer items-center justify-center rounded-lg text-header-muted hover:text-header-text" />
            <Link href="/login" className="ml-1 hidden rounded-lg px-3 py-2 text-[14px] font-semibold hover:bg-white/10 sm:inline-flex">
              {l.login}
            </Link>
          </div>
        </nav>

        <section className="mx-auto grid w-full max-w-[1200px] items-center gap-12 px-4 pt-8 pb-20 sm:px-6 sm:pt-14 lg:grid-cols-[1.1fr_1fr] lg:pb-28">
          <div className="flex flex-col gap-6">
            <span className="land-in inline-flex w-fit items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-[12px] font-semibold tracking-wider text-header-muted uppercase">
              <span className="size-1.5 rounded-full bg-accent" />
              {l.eyebrow}
            </span>
            <h1 className="land-in text-[38px] leading-[1.05] font-bold tracking-tight sm:text-[56px]" style={{ animationDelay: "80ms" }}>
              {l.titleA}
              <br />
              <span className="bg-gradient-to-r from-[#f0a27a] via-accent to-[#e0b15f] bg-clip-text text-transparent">{l.titleB}</span>
            </h1>
            <p className="land-in max-w-xl text-[16px] leading-relaxed text-header-muted sm:text-[18px]" style={{ animationDelay: "160ms" }}>
              {l.lead}
            </p>
            <div className="land-in flex flex-wrap gap-3" style={{ animationDelay: "240ms" }}>
              <Link
                href="/register"
                className="group land-shine inline-flex h-12 items-center gap-2 rounded-lg bg-accent px-6 text-[15px] font-semibold text-accent-fg shadow-lg shadow-accent/25 transition hover:-translate-y-0.5 hover:bg-accent-hover"
              >
                {l.register}
                <ArrowRight size={18} className="transition-transform group-hover:translate-x-1" aria-hidden />
              </Link>
              <Link href="/login" className="inline-flex h-12 items-center rounded-lg border border-white/20 px-6 text-[15px] font-semibold transition hover:-translate-y-0.5 hover:bg-white/10">
                {l.login}
              </Link>
            </div>
            <ul className="land-in flex flex-wrap gap-x-5 gap-y-2 text-[13px] text-header-muted" style={{ animationDelay: "320ms" }}>
              {l.trust.map((x) => (
                <li key={x} className="flex items-center gap-1.5">
                  <Check size={15} className="text-[#4ade80]" aria-hidden />
                  {x}
                </li>
              ))}
            </ul>
            {demo && (
              <div className="land-in" style={{ animationDelay: "400ms" }}>
                <DemoButtons />
              </div>
            )}
          </div>
          <LiveDemo l={l} />
        </section>
      </header>

      <main className="mx-auto flex w-full max-w-[1200px] flex-col gap-24 px-4 py-20 sm:px-6">
        {/* ---------------- Qanday ishlaydi ---------------- */}
        <section id="how" className="flex scroll-mt-6 flex-col gap-8">
          <h2 data-reveal className="text-[28px] font-bold tracking-tight sm:text-[34px]">
            {l.stepsTitle}
          </h2>
          <ol className="relative grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <span className="pointer-events-none absolute top-[38px] right-[12%] left-[12%] hidden h-px bg-gradient-to-r from-transparent via-line to-transparent lg:block" aria-hidden />
            {l.steps.map((s, i) => {
              const Icon = STEP_ICONS[i] ?? Search;
              return (
                <li
                  key={s.title}
                  data-reveal
                  style={delay(i)}
                  className="group relative flex flex-col gap-3 rounded-2xl border border-line bg-surface p-6 transition duration-300 hover:-translate-y-1 hover:border-accent/40 hover:shadow-xl hover:shadow-accent/5"
                >
                  <span className="flex items-center gap-3">
                    <span className="flex size-11 items-center justify-center rounded-xl bg-accent-soft text-accent transition duration-300 group-hover:scale-110 group-hover:bg-accent group-hover:text-accent-fg">
                      <Icon size={20} aria-hidden />
                    </span>
                    <span className="text-[13px] font-bold text-muted tabular-nums">0{i + 1}</span>
                  </span>
                  <h3 className="text-[18px] font-bold">{s.title}</h3>
                  <p className="text-[14px] leading-relaxed text-muted">{s.text}</p>
                </li>
              );
            })}
          </ol>
        </section>

        {/* ---------------- Imkoniyatlar ---------------- */}
        <section id="features" className="flex scroll-mt-6 flex-col gap-8">
          <div data-reveal className="flex max-w-2xl flex-col gap-2">
            <h2 className="text-[28px] font-bold tracking-tight sm:text-[34px]">{l.featuresTitle}</h2>
            <p className="text-[16px] text-muted">{l.featuresLead}</p>
          </div>
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {l.features.map((f, i) => {
              const Icon = FEATURE_ICONS[i] ?? Check;
              return (
                <li
                  key={f.title}
                  data-reveal
                  style={delay(i % 3)}
                  className="group flex flex-col gap-3 rounded-2xl border border-line bg-surface p-6 transition duration-300 hover:-translate-y-1 hover:border-accent/40 hover:shadow-xl hover:shadow-accent/5"
                >
                  <span className="flex size-11 items-center justify-center rounded-xl bg-surface-2 text-accent transition duration-300 group-hover:rotate-[-6deg] group-hover:bg-accent-soft">
                    <Icon size={20} aria-hidden />
                  </span>
                  <h3 className="text-[17px] font-bold">{f.title}</h3>
                  <p className="text-[14px] leading-relaxed text-muted">{f.text}</p>
                </li>
              );
            })}
          </ul>
        </section>

        {/* ---------------- Do'kon / kompaniya ---------------- */}
        <section className="grid gap-4 md:grid-cols-2">
          {[
            { Icon: Store, title: l.forBuyers, points: l.buyerPoints },
            { Icon: Building2, title: l.forSellers, points: l.sellerPoints },
          ].map(({ Icon, title, points }, i) => (
            <div key={title} data-reveal style={delay(i)} className="flex flex-col gap-4 rounded-2xl border border-line bg-surface p-7">
              <h2 className="flex items-center gap-2.5 text-xl font-bold">
                <span className="flex size-10 items-center justify-center rounded-xl bg-accent text-accent-fg">
                  <Icon size={20} aria-hidden />
                </span>
                {title}
              </h2>
              <ul className="flex flex-col gap-3">
                {points.map((p) => (
                  <li key={p} className="flex items-start gap-3 text-[15px]">
                    <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-accent-soft text-accent">
                      <Check size={13} strokeWidth={3} aria-hidden />
                    </span>
                    {p}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </section>

        {/* ---------------- Chaqiriq ---------------- */}
        <section data-reveal className="relative isolate flex flex-col items-start gap-4 overflow-hidden rounded-3xl bg-header px-6 py-12 text-header-text sm:px-12">
          <div className="land-blob pointer-events-none absolute -top-24 -right-16 -z-10 size-[320px] rounded-full bg-accent/40 blur-3xl" aria-hidden />
          <h2 className="text-[28px] font-bold tracking-tight sm:text-[34px]">{l.ctaTitle}</h2>
          <p className="max-w-xl text-header-muted">{l.ctaText}</p>
          <Link href="/register" className="group land-shine inline-flex h-12 items-center gap-2 rounded-lg bg-accent px-6 text-[15px] font-semibold text-accent-fg transition hover:-translate-y-0.5 hover:bg-accent-hover">
            {l.register}
            <ArrowRight size={18} className="transition-transform group-hover:translate-x-1" aria-hidden />
          </Link>
        </section>
      </main>

      <footer className="border-t border-line py-8 text-center text-[13px] text-muted">
        <Logo className="mb-2 justify-center" />
        <p>{t.common.tagline}</p>
      </footer>
    </div>
  );
}
