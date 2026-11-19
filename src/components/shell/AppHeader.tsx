"use client";

import clsx from "clsx";
import { MessageSquare, ShoppingCart } from "lucide-react";
import Link from "next/link";
import { SearchBox } from "@/components/catalog/SearchBox";
import { ThemeToggle } from "@/components/Preferences";
import { Logo } from "@/components/ui/Logo";
import { useI18n } from "@/i18n/client";
import type { SessionUser } from "@/lib/auth/session";
import { homePath, mainNav } from "@/lib/navigation";
import { AccountMenu } from "./AccountMenu";
import { MainNav } from "./MainNav";
import { NotificationsMenu } from "./NotificationsMenu";
import { useBadges } from "./useBadges";
import { headerIconClass } from "./styles";

export function AppHeader({ user }: { user: SessionUser }) {
  const { t } = useI18n();
  const [badges, refreshBadges] = useBadges();

  return (
    <header className="sticky top-0 z-30 text-text">
      {/*
        Shisha fon alohida qatlamda: header o'zi backdrop-filter olmasa, ichidagi ochiladigan menyular
        (hover menyu, profil, bildirishnomalar) sahifa kontentini ham xiralashtira oladi.
      */}
      <div
        aria-hidden
        className="absolute inset-0 -z-10 border-b border-[var(--c-glass-border)] bg-[var(--c-glass)] shadow-[0_1px_0_var(--c-glass-highlight)_inset,0_10px_30px_-24px_rgb(15_40_90/0.35)] backdrop-blur-xl backdrop-saturate-150"
      />
      <div className="mx-auto flex h-16 max-w-[1320px] items-center gap-4 px-4 sm:px-6 lg:gap-5">
        <Link href={homePath[user.role]} aria-label="Savdochi" className="shrink-0 rounded-lg transition-opacity hover:opacity-90">
          <Logo />
        </Link>

        <MainNav items={mainNav[user.role]} />

        {/* Qidiruv: Kompaniya | Mahsulot almashtirgichi bilan. */}
        <SearchBox className="hidden min-w-0 flex-1 lg:block" />

        <div className="ml-auto flex items-center gap-0.5 lg:ml-0">
          <Link href="/chat" aria-label={t.header.chat} title={t.header.chat} className={clsx(headerIconClass, "relative hidden sm:flex")}>
            <MessageSquare size={20} aria-hidden />
            <CountBadge count={badges.chats} />
          </Link>
          <NotificationsMenu count={badges.notifications} onChange={refreshBadges} />
          {user.role === "buyer" && (
            <Link href="/cart" aria-label={t.header.cart} title={t.header.cart} className={clsx(headerIconClass, "relative hidden sm:flex")}>
              <ShoppingCart size={20} aria-hidden />
              <CountBadge count={badges.cart} />
            </Link>
          )}
          <ThemeToggle className={clsx(headerIconClass, "hidden sm:flex")} />
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
