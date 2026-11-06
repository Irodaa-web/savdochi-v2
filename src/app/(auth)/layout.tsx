import { Check } from "lucide-react";
import { Logo } from "@/components/ui/Logo";
import { LanguageSwitch, ThemeToggle } from "@/components/Preferences";
import { getDictionary, getLocale } from "@/i18n/server";

/**
 * Kirish va ro'yxatdan o'tish uchun umumiy ko'rinish.
 * Kompyuterda: chapda to'q panel, o'ngda forma. Telefonda: faqat forma (ilova kabi).
 */
export default async function AuthLayout({ children }: { children: React.ReactNode }) {
  const t = getDictionary(await getLocale());

  return (
    <div className="flex min-h-dvh">
      <aside className="hidden w-[44%] max-w-[560px] flex-col justify-between bg-header p-10 text-header-text lg:flex">
        <Logo tone="light" />
        <div className="flex flex-col gap-6">
          <h2 className="text-[32px] leading-tight font-bold tracking-tight">{t.auth.sideTitle}</h2>
          <ul className="flex flex-col gap-3.5">
            {t.auth.sidePoints.map((point) => (
              <li key={point} className="flex items-start gap-3 text-[15px] text-header-muted">
                <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-accent text-accent-fg">
                  <Check size={13} strokeWidth={3} aria-hidden />
                </span>
                {point}
              </li>
            ))}
          </ul>
        </div>
        <p className="text-[13px] text-header-muted">{t.common.tagline}</p>
      </aside>

      <main className="flex flex-1 flex-col">
        <div className="flex items-center justify-between gap-3 px-5 py-4 sm:px-8">
          <Logo className="lg:invisible" />
          <div className="flex items-center gap-1">
            <LanguageSwitch />
            <ThemeToggle className="flex size-10 cursor-pointer items-center justify-center rounded-lg text-muted hover:bg-surface-2 hover:text-text" />
          </div>
        </div>
        <div className="flex flex-1 items-start justify-center px-5 pt-4 pb-12 sm:items-center sm:px-8">
          <div className="w-full max-w-[420px]">{children}</div>
        </div>
      </main>
    </div>
  );
}
