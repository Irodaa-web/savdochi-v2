"use client";

import {
  CircleHelp,
  CreditCard,
  Heart,
  LogOut,
  Settings,
  ShieldCheck,
  UserRound,
  Users,
  UsersRound,
  Wallet,
  Warehouse,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { LanguageSwitch } from "@/components/Preferences";
import { useI18n } from "@/i18n/client";
import { api } from "@/lib/apiClient";
import type { SessionUser } from "@/lib/auth/session";
import { formatPhone } from "@/lib/phone";
import { staffPageAllowed } from "@/lib/staff";
import { usePopover } from "./usePopover";
import { Avatar } from "@/components/ui/Avatar";


const itemClass =
  "flex items-center gap-3 rounded-xl px-3 py-2.5 text-text transition-colors hover:bg-accent-soft/70 hover:text-accent";

export function AccountMenu({ user }: { user: SessionUser }) {
  const { t } = useI18n();
  const router = useRouter();
  const { open, setOpen, ref } = usePopover();
  const [leaving, setLeaving] = useState(false);

  async function logout() {
    setLeaving(true);
    await api("/api/v1/auth/logout", { method: "POST" });
    router.replace("/login");
    router.refresh();
  }

  const close = () => setOpen(false);
  // Xodimga faqat roliga ochiq bo'limlar ko'rsatiladi.
  const can = (href: string) =>
    !user.staff || staffPageAllowed(user.staff.role, href);

  return (
    <div ref={ref} className="relative ml-1.5">
      <button
        type="button"
        aria-label={t.header.account}
        aria-expanded={open}
        aria-haspopup="menu"
        onClick={() => setOpen((v) => !v)}
        className="flex cursor-pointer rounded-xl transition-transform duration-200 hover:scale-105 active:scale-95"
      >
        {/* Hisob rasmi (xodim uchun — kompaniya logotipi), bo'lmasa — rangli fonda bosh harflar. */}
        <Avatar name={user.staff?.name ?? user.name} src={user.logo} size="sm" className="size-9" />
      </button>

      {open && (
        <div
          role="menu"
          className="glass-strong menu-in absolute top-12 right-0 w-64 rounded-2xl p-1.5 text-text"
        >
          <div className="mb-1.5 border-b border-line px-3 pt-2 pb-3">
            <div className="truncate font-semibold">
              {user.staff ? user.staff.name : user.name}
            </div>
            <div className="text-[12px] text-muted">
              {user.staff
                ? `${t.staff.roles[user.staff.role]} · ${user.name}`
                : `${user.isAdmin ? t.admin.title : t.roles[user.role]} · ${formatPhone(user.phone)}`}
            </div>
          </div>
          {!user.isAdmin && (
            <>
              {!user.staff && (
                <Link
                  role="menuitem"
                  href="/profile"
                  onClick={close}
                  className={itemClass}
                >
                  <UserRound size={16} aria-hidden />
                  {t.header.profile}
                </Link>
              )}
              {can("/partners") && (
                <Link
                  role="menuitem"
                  href="/partners"
                  onClick={close}
                  className={itemClass}
                >
                  <Users size={16} aria-hidden />
                  {user.role === "seller"
                    ? t.header.myClients
                    : t.header.myPartners}
                </Link>
              )}
              {can("/debts") && (
                <Link
                  role="menuitem"
                  href="/debts"
                  onClick={close}
                  className={itemClass}
                >
                  <Wallet size={16} aria-hidden />
                  {t.header.debts}
                </Link>
              )}
              {user.role === "seller" && !user.staff && (
                <Link
                  role="menuitem"
                  href="/staff"
                  onClick={close}
                  className={itemClass}
                >
                  <UsersRound size={16} aria-hidden />
                  {t.navMenu.staff}
                </Link>
              )}
              {user.role === "seller" && !user.staff && (
                <Link
                  role="menuitem"
                  href="/profile#online-pay"
                  onClick={close}
                  className={itemClass}
                >
                  <CreditCard size={16} aria-hidden />
                  {t.header.payments}
                </Link>
              )}
              {user.role === "buyer" && (
                <>
                  <Link
                    role="menuitem"
                    href="/stock"
                    onClick={close}
                    className={itemClass}
                  >
                    <Warehouse size={16} aria-hidden />
                    {t.nav.stock}
                  </Link>
                  <Link
                    role="menuitem"
                    href="/favorites"
                    onClick={close}
                    className={itemClass}
                  >
                    <Heart size={16} aria-hidden />
                    {t.favorites.title}
                  </Link>
                </>
              )}
            </>
          )}
          {user.isAdmin && (
            <Link
              role="menuitem"
              href="/admin"
              onClick={close}
              className={itemClass}
            >
              <ShieldCheck size={16} aria-hidden />
              {t.admin.title}
            </Link>
          )}
          <Link
            role="menuitem"
            href="/settings"
            onClick={close}
            className={itemClass}
          >
            <Settings size={16} aria-hidden />
            {t.header.settings}
          </Link>
          {!user.isAdmin && (
            <Link
              role="menuitem"
              href="/help"
              onClick={close}
              className={itemClass}
            >
              <CircleHelp size={16} aria-hidden />
              {t.header.help}
            </Link>
          )}
          <div className="my-1.5 flex items-center justify-between gap-2 border-t border-line px-3 pt-3 pb-1.5">
            <span className="text-[13px] text-muted">{t.header.language}</span>
            <LanguageSwitch />
          </div>
          <button
            role="menuitem"
            type="button"
            onClick={logout}
            disabled={leaving}
            className="flex w-full cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 text-danger transition-colors hover:bg-danger-soft disabled:opacity-60"
          >
            <LogOut size={16} aria-hidden />
            {t.header.logout}
          </button>
        </div>
      )}
    </div>
  );
}
