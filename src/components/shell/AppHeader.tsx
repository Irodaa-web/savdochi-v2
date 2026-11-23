"use client";

import clsx from "clsx";
import { Menu, MessageSquare, Search, ShoppingCart } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";
import { ThemeToggle } from "@/components/Preferences";
import { Logo } from "@/components/ui/Logo";
import { useI18n } from "@/i18n/client";
import type { SessionUser } from "@/lib/auth/session";
import { homePath } from "@/lib/navigation";
import { staffPageAllowed } from "@/lib/staff";
import { AccountMenu } from "./AccountMenu";
import { GlobalSearch } from "./GlobalSearch";
import { NotificationsMenu } from "./NotificationsMenu";
import { useShell } from "./Shell";
import { useBadges } from "./useBadges";
import { headerIconClass } from "./styles";

/**
 * Yuqori panel: (telefonda ☰ menyu) · yagona qidiruv · chat, bildirishnomalar, savat, mavzu, hisob.
 * Bo'limlar endi chapdagi sidebar'da.
 */
export function AppHeader({ user }: { user: SessionUser }) {
  const { t } = useI18n();
  const [badges, refreshBadges] = useBadges();
  const { drawer, setDrawer } = useShell();

  return (
    <header className="sticky top-0 z-30 text-text">
      {/*
        Shisha fon alohida qatlamda: header o'zi backdrop-filter olmasa, ichidagi ochiladigan menyular
        (qidiruv, profil, bildirishnomalar) sahifa kontentini ham xiralashtira oladi.
      */}
      <div
        aria-hidden
        className="absolute inset-0 -z-10 border-b border-[var(--c-glass-border)] bg-[var(--c-glass)] shadow-[0_1px_0_var(--c-glass-highlight)_inset,0_10px_30px_-24px_rgb(15_40_90/0.35)] backdrop-blur-xl backdrop-saturate-150"
      />
      <div className="mx-auto flex h-16 max-w-[1320px] items-center gap-2 px-4 sm:gap-3 sm:px-6">
        <button
          type="button"
          onClick={() => setDrawer(true)}
          aria-label={t.navMenu.openMenu}
          aria-expanded={drawer}
          className={clsx(headerIconClass, "-ml-2 shrink-0 lg:hidden")}
        >
          <Menu size={21} aria-hidden />
        </button>
        <Link href={user.isAdmin ? "/admin" : homePath[user.role]} aria-label="Savdochi" className="hidden shrink-0 sm:block lg:hidden">
          <Logo markOnly />
        </Link>

        {/* Administrator — foydalanuvchilarni qidiradi; omborchi katalog (narxlar)ni ko'rmaydi — qidiruv yo'q. */}
        {user.isAdmin ? (
          <form action="/admin/users" role="search" className="min-w-0 flex-1 lg:max-w-xl">
            <label className="flex h-10 items-center gap-2 rounded-xl border border-[var(--c-glass-border)] bg-[var(--c-glass-strong)] px-3 text-muted transition-all focus-within:border-accent focus-within:ring-4 focus-within:ring-accent/15 hover:border-accent/40">
              <Search size={16} className="shrink-0" aria-hidden />
              <input name="q" type="search" placeholder={t.adminNav.searchUsers} aria-label={t.adminNav.searchUsers} className="focus-none min-w-0 flex-1 bg-transparent text-[14px] text-text outline-none placeholder:text-muted" />
            </label>
          </form>
        ) : user.staff?.role === "warehouse" ? (
          <div className="min-w-0 flex-1" />
        ) : (
          <Suspense fallback={<div className="h-10 min-w-0 flex-1 rounded-xl border border-[var(--c-glass-border)] bg-[var(--c-glass-strong)] lg:max-w-xl" />}>
            <GlobalSearch className="min-w-0 flex-1 lg:max-w-xl" />
          </Suspense>
        )}

        <div className="ml-auto flex shrink-0 items-center gap-0.5">
          {!user.isAdmin && (!user.staff || staffPageAllowed(user.staff.role, "/chat")) && (
            <Link href="/chat" aria-label={t.header.chat} title={t.header.chat} className={clsx(headerIconClass, "relative hidden md:flex")}>
              <MessageSquare size={20} aria-hidden />
              <CountBadge count={badges.chats} />
            </Link>
          )}
          <NotificationsMenu count={badges.notifications} onChange={refreshBadges} />
          {user.role === "buyer" && !user.isAdmin && (
            <Link href="/cart" aria-label={t.header.cart} title={t.header.cart} className={clsx(headerIconClass, "relative hidden md:flex")}>
              <ShoppingCart size={20} aria-hidden />
              <CountBadge count={badges.cart} />
            </Link>
          )}
          <ThemeToggle className={clsx(headerIconClass, "hidden md:flex")} />
          <AccountMenu user={user} />
        </div>
      </div>
    </header>
  );
}

/** Raqamli belgi (o'qilmaganlar soni). 0 bo'lsa ko'rinmaydi. */
export function CountBadge({ count }: { count: number }) {
  if (count <= 0) return null;
  return (
    <span className="absolute top-1 right-0.5 min-w-4 rounded-full bg-accent px-1 text-center text-[10px] leading-4 font-bold text-accent-fg shadow-[0_0_0_2px_var(--c-surface)]">
      {count > 99 ? "99+" : count}
    </span>
  );
}
