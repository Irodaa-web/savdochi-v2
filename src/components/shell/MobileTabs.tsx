"use client";

import clsx from "clsx";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useI18n } from "@/i18n/client";
import type { Role } from "@/lib/auth/token";
import { mobileTabs } from "@/lib/navigation";

/** Telefonda pastki panel — suzuvchi shisha panel, ilova kabi. Kompyuterda yashirin. */
export function MobileTabs({ role }: { role: Role }) {
  const { t } = useI18n();
  const pathname = usePathname();

  return (
    <nav className="fixed inset-x-3 bottom-[max(0.75rem,env(safe-area-inset-bottom))] z-30 md:hidden">
      <div className="glass-strong grid grid-cols-4 gap-1 rounded-2xl p-1.5">
        {mobileTabs[role].map(({ href, label, Icon }) => {
          const active = pathname === href || pathname.startsWith(`${href}/`);
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              className={clsx(
                "flex flex-col items-center gap-1 rounded-xl py-2 text-[11px] transition-all duration-200 active:scale-95",
                active ? "bg-accent-soft font-semibold text-accent shadow-[inset_0_1px_0_var(--c-glass-highlight)]" : "font-medium text-muted",
              )}
            >
              <Icon size={21} aria-hidden strokeWidth={active ? 2.3 : 2} />
              {t.nav[label]}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
