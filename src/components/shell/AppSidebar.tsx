"use client";

import clsx from "clsx";
import { ChevronDown, CircleHelp, PanelLeftClose, PanelLeftOpen, Plus, Settings, ShieldCheck, UserRound, X, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useState } from "react";
import { LanguageSwitch, ThemeToggle } from "@/components/Preferences";
import { Logo } from "@/components/ui/Logo";
import { fmt, useI18n } from "@/i18n/client";
import type { SessionUser } from "@/lib/auth/session";
import { homePath, sidebarNav, type SideItem } from "@/lib/navigation";
import { LogoutButton } from "./LogoutButton";
import { useShell } from "./Shell";
import { useBadges } from "./useBadges";

const isActive = (pathname: string, href: string) => (href === "/" ? pathname === "/" : !href.includes("#") && (pathname === href || pathname.startsWith(`${href}/`)));

/**
 * Asosiy navigatsiya — sidebar.
 * Kompyuterda: chapda doimiy, yig'ish/yoyish mumkin (yig'ilganda faqat belgilar, nomi — tooltip'da).
 * Telefon/planshetda: chapdan chiqadigan shisha panel (☰ yoki pastki paneldagi "Yana" bilan ochiladi).
 * Har bandda raqamli belgi (yangi buyurtmalar, savat, xabarlar) va ochiladigan ichki sahifalar.
 */
export function AppSidebar({ user }: { user: SessionUser }) {
  const { t } = useI18n();
  const pathname = usePathname();
  const { drawer, setDrawer, collapsed, toggleCollapsed } = useShell();
  const [badges] = useBadges();
  // Kompyuterda yig'ilgan holat faqat lg dan katta ekranda amal qiladi; telefondagi panel doim to'liq.
  const mini = collapsed;

  const footer: { href: string; Icon: LucideIcon; label: string }[] = [
    { href: "/profile", Icon: UserRound, label: t.header.profile },
    { href: "/settings", Icon: Settings, label: t.header.settings },
    { href: "/help", Icon: CircleHelp, label: t.header.help },
    ...(user.isAdmin ? [{ href: "/admin", Icon: ShieldCheck, label: t.admin.title }] : []),
  ];
  // Tezkor amal faqat kompaniyada (do'kon uchun savat ro'yxatning o'zida, belgi bilan).
  const quick = user.role === "seller" ? { href: "/products/new", Icon: Plus, label: t.products.add } : null;

  return (
    <>
      {/* Telefonda menyu orqasidagi qoplama — bosilsa yopiladi. */}
      <div
        aria-hidden
        onClick={() => setDrawer(false)}
        className={clsx("fixed inset-0 z-40 bg-[rgb(7_13_26/0.45)] backdrop-blur-sm transition-opacity duration-300 lg:hidden", drawer ? "opacity-100" : "pointer-events-none opacity-0")}
      />
      <aside
        aria-label={t.navMenu.label}
        className={clsx(
          "group/side fixed inset-y-0 left-0 z-50 flex w-[288px] flex-col border-r border-[var(--c-glass-border)] bg-[var(--c-glass-strong)] shadow-[var(--c-shadow-lg)] backdrop-blur-2xl backdrop-saturate-150 transition-[transform,visibility,width] duration-300 ease-out",
          "lg:sticky lg:top-0 lg:z-20 lg:h-dvh lg:translate-x-0 lg:shadow-[inset_-1px_0_0_var(--c-glass-highlight)] lg:visible",
          drawer ? "visible translate-x-0" : "invisible -translate-x-full",
          mini ? "lg:w-[76px]" : "lg:w-[264px]",
        )}
      >
        {/* Logotip va yig'ish tugmasi */}
        <div className={clsx("flex h-16 shrink-0 items-center gap-2 border-b border-line/70 px-4", mini && "lg:justify-center lg:px-2")}>
          <Link href={homePath[user.role]} aria-label="Savdochi" className={clsx("min-w-0 flex-1", mini && "lg:flex-none")}>
            <span className={clsx(mini && "lg:hidden")}>
              <Logo />
            </span>
            <span className={clsx("hidden", mini && "lg:block")}>
              <Logo markOnly />
            </span>
          </Link>
          <button
            type="button"
            onClick={toggleCollapsed}
            aria-label={mini ? t.navMenu.expand : t.navMenu.collapse}
            title={mini ? t.navMenu.expand : t.navMenu.collapse}
            className={clsx("hidden size-9 shrink-0 cursor-pointer items-center justify-center rounded-xl text-muted transition-colors hover:bg-surface-2 hover:text-accent lg:flex", mini && "lg:hidden")}
          >
            <PanelLeftClose size={18} aria-hidden />
          </button>
          <button type="button" onClick={() => setDrawer(false)} aria-label={t.navMenu.closeMenu} className="flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-xl text-muted hover:bg-surface-2 lg:hidden">
            <X size={18} aria-hidden />
          </button>
        </div>

        <nav className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-3 py-4 [scrollbar-width:thin] [&>*]:shrink-0">
          {/* Tezkor amal: kompaniya — yangi mahsulot, do'kon — savat */}
          {quick && (
          <Link
            href={quick.href}
            title={mini ? quick.label : undefined}
            className={clsx("btn-primary sheen flex h-10 items-center justify-center gap-2 rounded-xl text-[14px] font-semibold transition-all hover:brightness-110", mini && "lg:px-0")}
          >
            <quick.Icon size={17} aria-hidden />
            <span className={clsx(mini && "lg:sr-only")}>{quick.label}</span>
          </Link>
          )}

          {sidebarNav[user.role].map((group) => (
            <div key={group.title(t)} className="flex flex-col gap-0.5">
              <p className={clsx("px-3 pb-1 text-[11px] font-semibold tracking-wider text-muted uppercase", mini && "lg:sr-only")}>{group.title(t)}</p>
              {mini && <span aria-hidden className="mx-auto mb-1 hidden h-px w-8 bg-line lg:block" />}
              {group.items.map((item) => (
                <SideLink key={item.href} item={item} pathname={pathname} mini={mini} count={item.badge ? badges[item.badge] : 0} />
              ))}
            </div>
          ))}
        </nav>

        {/* Hisob: profil, sozlamalar, yordam; til, mavzu, chiqish */}
        <div className="shrink-0 border-t border-line/70 px-3 py-2.5">
          <div className="flex flex-col gap-0.5">
            {footer.map(({ href, Icon, label }) => {
              const active = isActive(pathname, href);
              return (
                <Link
                  key={href}
                  href={href}
                  title={mini ? label : undefined}
                  aria-current={active ? "page" : undefined}
                  className={clsx(
                    "flex h-8 items-center gap-3 rounded-xl px-3 text-[13.5px] transition-colors",
                    active ? "bg-accent-soft font-semibold text-accent" : "text-muted hover:bg-surface-2/80 hover:text-text",
                    mini && "lg:justify-center lg:px-0",
                  )}
                >
                  <Icon size={17} aria-hidden className="shrink-0" />
                  <span className={clsx("truncate", mini && "lg:sr-only")}>{label}</span>
                </Link>
              );
            })}
          </div>
          <div className={clsx("mt-2 flex items-center gap-1 rounded-2xl border border-line/70 bg-surface-2/50 py-1 pr-1 pl-2", mini && "lg:hidden")}>
            <div className="min-w-0 flex-1">
              <LanguageSwitch />
            </div>
            <ThemeToggle className="flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-xl text-muted transition-colors hover:text-accent" />
            <LogoutButton compact />
          </div>
          {mini && (
            <button
              type="button"
              onClick={toggleCollapsed}
              aria-label={t.navMenu.expand}
              title={t.navMenu.expand}
              className="mx-auto mt-2 hidden size-9 cursor-pointer items-center justify-center rounded-xl text-muted transition-colors hover:bg-surface-2 hover:text-accent lg:flex"
            >
              <PanelLeftOpen size={18} aria-hidden />
            </button>
          )}
        </div>
      </aside>
    </>
  );
}

/** Bitta band: havola + (bo'lsa) ichki sahifalarni ochuvchi ▾ tugmasi. Joriy bo'limning ichki sahifalari ochiq turadi. */
function SideLink({ item, pathname, mini, count }: { item: SideItem; pathname: string; mini: boolean; count: number }) {
  const { t } = useI18n();
  const active = isActive(pathname, item.href);
  const [open, setOpen] = useState(active);
  // Ichki sahifa manzili so'rov qismi bilan solishtiriladi: /catalog va /catalog?view=products alohida.
  const search = useSearchParams().toString();
  const here = search ? `${pathname}?${search}` : pathname;
  const name = item.label(t);
  const hasChildren = Boolean(item.children?.length);
  const expanded = hasChildren && open;

  return (
    <div>
      <div
        className={clsx(
          "relative flex items-center rounded-xl transition-colors duration-200",
          active ? "bg-accent-soft text-accent shadow-[inset_0_0_0_1px_color-mix(in_oklab,var(--c-accent)_18%,transparent)]" : "text-text hover:bg-surface-2/80",
        )}
      >
        {active && <span aria-hidden className="absolute top-2 bottom-2 left-0 w-[3px] rounded-r-full bg-accent" />}
        <Link
          href={item.href}
          title={mini ? name : undefined}
          aria-current={active ? "page" : undefined}
          className={clsx("flex h-10 min-w-0 flex-1 items-center gap-3 px-3 text-[14px]", active ? "font-semibold" : "font-medium", mini && "lg:justify-center lg:px-0")}
        >
          <span className="relative shrink-0">
            <item.Icon size={18} aria-hidden className={active ? "" : "text-muted"} />
            {count > 0 && mini && <span aria-hidden className="absolute -top-1 -right-1 hidden size-2 rounded-full bg-danger ring-2 ring-surface lg:block" />}
          </span>
          <span className={clsx("min-w-0 flex-1 truncate", mini && "lg:sr-only")}>{name}</span>
          {count > 0 && (
            <span className={clsx("min-w-5 rounded-full bg-accent px-1.5 text-center text-[11px] leading-5 font-bold text-accent-fg", mini && "lg:hidden")}>
              {count > 99 ? "99+" : count}
            </span>
          )}
        </Link>
        {hasChildren && (
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={expanded}
            aria-label={fmt(t.navMenu.subPages, { name })}
            className={clsx("mr-1 flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-lg text-muted transition-colors hover:bg-black/5 hover:text-text dark:hover:bg-white/10", mini && "lg:hidden")}
          >
            <ChevronDown size={15} aria-hidden className={clsx("transition-transform duration-300", expanded && "rotate-180")} />
          </button>
        )}
      </div>
      {hasChildren && (
        // Silliq ochilish: grid-rows 0fr → 1fr.
        <div className={clsx("grid transition-[grid-template-rows,opacity] duration-300 ease-out", expanded ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0", mini && "lg:hidden")}>
          <ul className="min-h-0 overflow-hidden">
            <li className="relative ml-[22px] flex flex-col gap-0.5 border-l border-line py-1 pl-3">
              {item.children!.map((child) => {
                const current = child.href === here;
                return (
                  <Link
                    key={child.href}
                    href={child.href}
                    tabIndex={expanded ? undefined : -1}
                    className={clsx(
                      "flex h-8 items-center gap-2 rounded-lg px-2.5 text-[13px] transition-colors",
                      current ? "bg-accent-soft font-semibold text-accent" : "text-muted hover:bg-surface-2/80 hover:text-text",
                    )}
                  >
                    <child.Icon size={14} aria-hidden className="shrink-0" />
                    <span className="truncate">{child.label(t)}</span>
                  </Link>
                );
              })}
            </li>
          </ul>
        </div>
      )}
    </div>
  );
}
