"use client";

import clsx from "clsx";
import { MessageSquare, Search, ShoppingCart } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ThemeToggle } from "@/components/Preferences";
import { Logo } from "@/components/ui/Logo";
import { useI18n } from "@/i18n/client";
import type { SessionUser } from "@/lib/auth/session";
import { homePath, mainNav } from "@/lib/navigation";
import { AccountMenu } from "./AccountMenu";
import { NotificationsMenu } from "./NotificationsMenu";
import { headerIconClass } from "./styles";

export function AppHeader({ user }: { user: SessionUser }) {
  const { t } = useI18n();
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-30 bg-header text-header-text">
      <div className="mx-auto flex h-16 max-w-[1320px] items-center gap-5 px-4 sm:px-6">
        <Link href={homePath[user.role]} aria-label="Savdochi">
          <Logo tone="light" />
        </Link>

        <nav className="hidden items-center gap-0.5 md:flex">
          {mainNav[user.role].map(({ href, label }) => {
            const active = pathname === href || pathname.startsWith(`${href}/`);
            return (
              <Link
                key={href}
                href={href}
                aria-current={active ? "page" : undefined}
                className={clsx(
                  "rounded-md px-3 py-2 font-medium transition-colors",
                  active ? "bg-header-2 text-header-text" : "text-header-muted hover:text-header-text",
                )}
              >
                {t.nav[label]}
              </Link>
            );
          })}
        </nav>

        <form role="search" action={user.role === "buyer" ? "/catalog" : "/products"} className="hidden flex-1 lg:block">
          <label className="flex h-10 items-center gap-2 rounded-lg border border-header-line bg-header-2 px-3 text-header-muted focus-within:border-accent">
            <Search size={16} aria-hidden />
            <input
              type="search"
              name="q"
              aria-label={t.header.search}
              placeholder={t.header.search}
              className="min-w-0 flex-1 bg-transparent text-header-text outline-none placeholder:text-header-muted"
            />
          </label>
        </form>

        <div className="ml-auto flex items-center gap-0.5 lg:ml-0">
          <Link href="/chat" aria-label={t.header.chat} title={t.header.chat} className={clsx(headerIconClass, "hidden sm:flex")}>
            <MessageSquare size={20} aria-hidden />
          </Link>
          <NotificationsMenu />
          {user.role === "buyer" && (
            <Link href="/cart" aria-label={t.header.cart} title={t.header.cart} className={clsx(headerIconClass, "hidden sm:flex")}>
              <ShoppingCart size={20} aria-hidden />
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
    <span className="absolute top-1.5 right-1 min-w-4 rounded-full bg-accent px-1 text-center text-[10px] leading-4 font-bold text-accent-fg">
      {count > 99 ? "99+" : count}
    </span>
  );
}
