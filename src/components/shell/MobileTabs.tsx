"use client";

import clsx from "clsx";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useI18n } from "@/i18n/client";
import type { Role } from "@/lib/auth/token";
import { mobileTabs } from "@/lib/navigation";

/** Telefonda pastki panel — ilova kabi. Kompyuterda yashirin. */
export function MobileTabs({ role }: { role: Role }) {
  const { t } = useI18n();
  const pathname = usePathname();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-4 border-t border-line bg-surface pb-[env(safe-area-inset-bottom)] md:hidden">
      {mobileTabs[role].map(({ href, label, Icon }) => {
        const active = pathname === href || pathname.startsWith(`${href}/`);
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={clsx("flex flex-col items-center gap-1 py-2.5 text-[11px]", active ? "font-semibold text-accent" : "font-medium text-muted")}
          >
            <Icon size={22} aria-hidden />
            {t.nav[label]}
          </Link>
        );
      })}
    </nav>
  );
}
