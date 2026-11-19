"use client";

import { CircleHelp, CreditCard, Heart, Settings, ShieldCheck, UserRound, Wallet, Warehouse, X, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import { LanguageSwitch, ThemeToggle } from "@/components/Preferences";
import { useI18n } from "@/i18n/client";
import type { SessionUser } from "@/lib/auth/session";
import { mainNav } from "@/lib/navigation";
import { LogoutButton } from "./LogoutButton";

/**
 * Telefondagi "Yana" paneli — pastdan chiqadigan shisha oyna: barcha bo'limlar va ularning ichki
 * sahifalari (kompyuterdagi hover menyular bilan bir xil ro'yxat), hisob bo'limlari, til/mavzu, chiqish.
 * Brauzerning <dialog> elementi: fokus ichida qoladi, Esc va fon bosilganda yopiladi.
 */
export function MobileMenu({ user, open, onClose }: { user: SessionUser; open: boolean; onClose: () => void }) {
  const { t } = useI18n();
  const pathname = usePathname();
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);

  // Boshqa sahifaga o'tilganda panel yopiladi.
  useEffect(() => onClose(), [pathname]); // eslint-disable-line react-hooks/exhaustive-deps

  const account: { href: string; Icon: LucideIcon; label: string }[] = [
    { href: "/profile", Icon: UserRound, label: t.header.profile },
    { href: "/debts", Icon: Wallet, label: t.header.debts },
    ...(user.role === "seller" ? [{ href: "/profile#online-pay", Icon: CreditCard, label: t.header.payments }] : []),
    ...(user.role === "buyer"
      ? [
          { href: "/stock", Icon: Warehouse, label: t.nav.stock },
          { href: "/favorites", Icon: Heart, label: t.favorites.title },
        ]
      : []),
    ...(user.isAdmin ? [{ href: "/admin", Icon: ShieldCheck, label: t.admin.title }] : []),
    { href: "/settings", Icon: Settings, label: t.header.settings },
    { href: "/help", Icon: CircleHelp, label: t.header.help },
  ];

  return (
    <dialog
      ref={ref}
      aria-label={t.navMenu.allSections}
      onClose={onClose}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="sheet-up glass-strong m-0 mt-auto max-h-[88dvh] w-full max-w-none overflow-y-auto rounded-t-3xl p-0 pb-[env(safe-area-inset-bottom)] text-text backdrop:bg-[rgb(7_13_26/0.45)] backdrop:backdrop-blur-sm md:hidden"
    >
      <div className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-line/70 bg-[var(--c-glass-strong)] px-5 pt-3 pb-3 backdrop-blur-xl">
        <span aria-hidden className="absolute top-1.5 left-1/2 h-1 w-10 -translate-x-1/2 rounded-full bg-line" />
        <div className="min-w-0 pt-1">
          <p className="truncate font-semibold">{user.name}</p>
          <p className="text-[12px] text-muted">{t.roles[user.role]}</p>
        </div>
        <button type="button" onClick={onClose} aria-label={t.common.close} className="mt-1 flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-xl text-muted hover:bg-surface-2">
          <X size={18} aria-hidden />
        </button>
      </div>

      <div className="flex flex-col gap-5 px-4 py-4">
        {mainNav[user.role].map((item) => {
          const links = item.menu?.flatMap((s) => s.links) ?? [];
          return (
            <section key={item.href} className="flex flex-col gap-2">
              <Link href={item.href} onClick={onClose} className="flex items-center gap-2.5 rounded-xl px-1 py-1 font-semibold">
                <span className="btn-primary flex size-8 items-center justify-center rounded-lg">
                  <item.Icon size={16} aria-hidden />
                </span>
                {t.nav[item.label]}
              </Link>
              {links.length > 0 && (
                <ul className="grid grid-cols-2 gap-1.5">
                  {links.map((link) => (
                    <li key={link.href}>
                      <Link
                        href={link.href}
                        onClick={onClose}
                        className="flex h-full items-center gap-2 rounded-xl bg-surface-2/70 px-2.5 py-2 text-[13px] leading-tight font-medium transition-colors active:bg-accent-soft"
                      >
                        <link.Icon size={15} className="shrink-0 text-accent" aria-hidden />
                        {link.label(t)}
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          );
        })}

        <section className="flex flex-col gap-2">
          <p className="px-1 text-[12px] font-semibold tracking-wider text-muted uppercase">{t.settings.accountTitle}</p>
          <ul className="grid grid-cols-2 gap-1.5">
            {account.map(({ href, Icon, label }) => (
              <li key={href}>
                <Link href={href} onClick={onClose} className="flex h-full items-center gap-2 rounded-xl bg-surface-2/70 px-2.5 py-2.5 text-[13px] font-medium transition-colors active:bg-accent-soft">
                  <Icon size={15} className="shrink-0 text-accent" aria-hidden />
                  {label}
                </Link>
              </li>
            ))}
          </ul>
        </section>

        <div className="flex items-center justify-between gap-3 rounded-2xl bg-surface-2/60 px-3 py-2.5">
          <LanguageSwitch />
          <ThemeToggle className="flex size-10 cursor-pointer items-center justify-center rounded-xl text-muted transition-colors hover:text-accent" />
        </div>
        <LogoutButton />
      </div>
    </dialog>
  );
}
