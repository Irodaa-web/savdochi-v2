"use client";

import clsx from "clsx";
import { Moon, Sun } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { LOCALE_COOKIE, locales, type Locale } from "@/i18n/config";
import { useI18n } from "@/i18n/client";

const YEAR = 60 * 60 * 24 * 365;

function setCookie(name: string, value: string) {
  document.cookie = `${name}=${value}; path=/; max-age=${YEAR}; samesite=lax`;
}

/** UZ · RU · EN — tanlangan til serverda ham ishlatiladi (cookie orqali). */
export function LanguageSwitch({ tone = "light" }: { tone?: "light" | "dark" }) {
  const { locale, t } = useI18n();
  const router = useRouter();
  const [pending, start] = useTransition();

  function choose(next: Locale) {
    if (next === locale) return;
    setCookie(LOCALE_COOKIE, next);
    start(() => router.refresh());
  }

  return (
    <div role="group" aria-label={t.header.language} className={clsx("inline-flex rounded-lg p-0.5", tone === "dark" ? "bg-header-2" : "bg-surface-2", pending && "opacity-70")}>
      {locales.map((l) => (
        <button
          key={l}
          type="button"
          onClick={() => choose(l)}
          aria-pressed={l === locale}
          className={clsx(
            "h-8 min-w-10 cursor-pointer rounded-md px-2 text-xs font-semibold uppercase transition-colors",
            l === locale
              ? tone === "dark"
                ? "bg-header-line text-header-text"
                : "bg-surface text-text shadow-sm"
              : tone === "dark"
                ? "text-header-muted hover:text-header-text"
                : "text-muted hover:text-text",
          )}
        >
          {l}
        </button>
      ))}
    </div>
  );
}

export function ThemeToggle({ className }: { className?: string }) {
  const { t } = useI18n();
  const [theme, setTheme] = useState<"light" | "dark">("light");

  useEffect(() => {
    setTheme(document.documentElement.dataset.theme === "dark" ? "dark" : "light");
  }, []);

  function toggle() {
    const next = theme === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = next;
    setCookie("theme", next);
    setTheme(next);
  }

  const label = theme === "dark" ? t.header.themeLight : t.header.themeDark;
  return (
    <button type="button" onClick={toggle} aria-label={label} title={label} className={className}>
      {theme === "dark" ? <Sun size={19} aria-hidden /> : <Moon size={19} aria-hidden />}
    </button>
  );
}
