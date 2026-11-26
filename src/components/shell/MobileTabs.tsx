"use client";

import clsx from "clsx";
import { LayoutGrid } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useI18n } from "@/i18n/client";
import type { SessionUser } from "@/lib/auth/session";
import { adminTabs, mobileTabs } from "@/lib/navigation";
import { staffPageAllowed } from "@/lib/staff";
import { useShell } from "./Shell";
import { useBadges } from "./useBadges";

const tabClass = "relative flex flex-col items-center gap-1 rounded-xl py-2 text-[11px] transition-all duration-200 active:scale-95";

/**
 * Telefonda pastki panel — suzuvchi shisha panel, ilova kabi. Kompyuterda yashirin.
 * 4 ta asosiy bo'lim (raqamli belgilar bilan) + "Yana" — chapdan sidebar menyusini ochadi.
 */
export function MobileTabs({ user }: { user: SessionUser }) {
  const { t } = useI18n();
  const pathname = usePathname();
  const [badges] = useBadges();
  const { drawer, setDrawer } = useShell();
  // Xodimga faqat roliga ochiq bo'limlar.
  // Administrator: boshqaruv bo'limlari; qolganlar — rol (xodim bo'lsa — uning huquqi) bo'yicha.
  const tabs = user.isAdmin
    ? adminTabs.map((tab) => ({ href: tab.href, Icon: tab.Icon, text: tab.label(t) }))
    : mobileTabs[user.role].filter((tab) => !user.staff || staffPageAllowed(user.staff.role, tab.href)).map((tab) => ({ href: tab.href, Icon: tab.Icon, text: t.nav[tab.label] }));
  const count: Record<string, number> = { "/cart": badges.cart, "/chat": badges.chats, "/orders": badges.orders, "/admin/tickets": badges.tickets, "/admin/billing": badges.planRequests };

  return (
    <>
      <nav className="fixed inset-x-3 bottom-[max(0.75rem,env(safe-area-inset-bottom))] z-30 md:hidden">
        <div className="glass-strong grid gap-1 rounded-2xl p-1.5" style={{ gridTemplateColumns: `repeat(${tabs.length + 1}, minmax(0, 1fr))` }}>
          {tabs.map(({ href, text, Icon }) => {
            const active = href === "/admin" ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);
            const n = count[href] ?? 0;
            return (
              <Link
                key={href}
                href={href}
                aria-current={active ? "page" : undefined}
                className={clsx(tabClass, active ? "bg-accent-soft font-semibold text-accent shadow-[inset_0_1px_0_var(--c-glass-highlight)]" : "font-medium text-muted")}
              >
                <span className="relative">
                  <Icon size={21} aria-hidden strokeWidth={active ? 2.3 : 2} />
                  {n > 0 && (
                    <span className="absolute -top-1.5 -right-2.5 min-w-4 rounded-full bg-accent px-1 text-center text-[10px] leading-4 font-bold text-accent-fg shadow-[0_0_0_2px_var(--c-surface)]">
                      {n > 99 ? "99+" : n}
                    </span>
                  )}
                </span>
                <span className="max-w-full truncate px-0.5">{text}</span>
                {n > 0 && <span className="sr-only">({n})</span>}
              </Link>
            );
          })}
          <button
            type="button"
            onClick={() => setDrawer(true)}
            aria-expanded={drawer}
            className={clsx(tabClass, "cursor-pointer", drawer ? "bg-accent-soft font-semibold text-accent" : "font-medium text-muted")}
          >
            <LayoutGrid size={21} aria-hidden />
            {t.navMenu.more}
          </button>
        </div>
      </nav>
    </>
  );
}
