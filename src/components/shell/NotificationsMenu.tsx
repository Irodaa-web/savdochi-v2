"use client";

import { Bell } from "lucide-react";
import { useI18n } from "@/i18n/client";
import { headerIconClass as iconClass } from "./styles";
import { usePopover } from "./usePopover";

/** Bildirishnomalar ro'yxati. Ma'lumot 5-bosqichda (chat va bildirishnomalar) ulanadi. */
export function NotificationsMenu() {
  const { t } = useI18n();
  const { open, setOpen, ref } = usePopover();

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-label={t.header.notifications}
        aria-expanded={open}
        aria-haspopup="dialog"
        title={t.header.notifications}
        onClick={() => setOpen((v) => !v)}
        className={iconClass}
      >
        <Bell size={20} aria-hidden />
      </button>
      {open && (
        <div
          role="dialog"
          aria-label={t.header.notifications}
          className="absolute top-12 right-0 w-[min(360px,calc(100vw-24px))] overflow-hidden rounded-xl border border-line bg-surface text-text shadow-xl"
        >
          <div className="border-b border-line px-4 py-3 font-semibold">{t.header.notifications}</div>
          <p className="px-4 py-8 text-center text-muted">{t.header.noNotifications}</p>
        </div>
      )}
    </div>
  );
}
