import { Check } from "lucide-react";
import { Aurora } from "@/components/ui/Aurora";
import { Logo } from "@/components/ui/Logo";
import { LanguageSwitch, ThemeToggle } from "@/components/Preferences";
import { getDictionary, getLocale } from "@/i18n/server";

/**
 * Kirish va ro'yxatdan o'tish uchun umumiy ko'rinish.
 * Kompyuterda: chapda ko'k gradient panel (suzuvchi shisha doiralar), o'ngda shisha kartadagi forma.
 * Telefonda: faqat forma (ilova kabi).
 */
export default async function AuthLayout({ children }: { children: React.ReactNode }) {
  const t = getDictionary(await getLocale());

  return (
    <div className="relative isolate flex min-h-dvh">
      <Aurora />
      <aside className="hero relative isolate hidden w-[44%] max-w-[560px] flex-col justify-between overflow-hidden p-10 lg:flex">
        <span aria-hidden className="orb -top-20 -right-16 size-72" />
        <span aria-hidden className="orb top-36 left-[42%] size-20 [animation-delay:-3s]" />
        <span aria-hidden className="orb -right-20 -bottom-28 size-64 [animation-delay:-6s]" />
        <Logo tone="light" className="relative" />
        <div className="relative flex flex-col gap-6">
          <h2 className="text-[34px] leading-tight font-bold tracking-tight">{t.auth.sideTitle}</h2>
          <ul className="flex flex-col gap-3">
            {t.auth.sidePoints.map((point) => (
              <li key={point} className="flex items-start gap-3 rounded-2xl border border-white/15 bg-white/[0.07] px-4 py-3 text-[15px] text-header-muted backdrop-blur-md">
                <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-white text-[#1d4ed8]">
                  <Check size={13} strokeWidth={3} aria-hidden />
                </span>
                {point}
              </li>
            ))}
          </ul>
        </div>
        <p className="relative text-[13px] text-header-muted">{t.common.tagline}</p>
      </aside>

      <main className="flex flex-1 flex-col">
        <div className="flex items-center justify-between gap-3 px-5 py-4 sm:px-8">
          <Logo className="lg:invisible" />
          <div className="flex items-center gap-1">
            <LanguageSwitch />
            <ThemeToggle className="flex size-10 cursor-pointer items-center justify-center rounded-xl text-muted transition-colors hover:bg-surface-2/80 hover:text-accent" />
          </div>
        </div>
        <div className="flex flex-1 items-start justify-center px-4 pt-2 pb-12 sm:items-center sm:px-8">
          <div className="glass-card menu-in w-full max-w-[460px] rounded-3xl p-6 sm:p-8">{children}</div>
        </div>
      </main>
    </div>
  );
}
