"use client";

import { Bell } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { fmt, formatDateTime } from "@/i18n/format";
import { useI18n } from "@/i18n/client";
import { api } from "@/lib/apiClient";
import type { NotificationView } from "@/server/notify";
import { CountBadge } from "./AppHeader";
import { headerIconClass as iconClass } from "./styles";
import { usePopover } from "./usePopover";

/** Bildirishnomalar: ochilganda yuklanadi, "barchasini o'qilgan qilish" mumkin. */
export function NotificationsMenu({ count, onChange }: { count: number; onChange: () => void }) {
  const { t, locale } = useI18n();
  const { open, setOpen, ref } = usePopover();
  const [items, setItems] = useState<NotificationView[] | null>(null);

  useEffect(() => {
    if (!open) return;
    void api<{ items: NotificationView[] }>("/api/v1/notifications").then((res) => res.ok && setItems(res.data.items));
  }, [open]);

  async function readAll() {
    await api("/api/v1/notifications", { method: "POST" });
    setItems((all) => all?.map((n) => ({ ...n, read: true })) ?? null);
    onChange();
  }

  const texts = t.notifications.types as Record<string, string>;
  const statusText = (p: Record<string, string | number>) => {
    const s = String(p.status ?? "");
    return { ...p, status: (t.orderStatus as Record<string, string>)[s] ?? (t.paymentStatus as Record<string, string>)[s] ?? s };
  };

  return (
    <div ref={ref} className="relative">
      <button type="button" aria-label={t.header.notifications} aria-expanded={open} aria-haspopup="dialog" title={t.header.notifications} onClick={() => setOpen((v) => !v)} className={`${iconClass} relative`}>
        <Bell size={20} aria-hidden />
        <CountBadge count={count} />
      </button>
      {open && (
        <div role="dialog" aria-label={t.header.notifications} className="absolute top-12 right-0 w-[min(360px,calc(100vw-24px))] overflow-hidden rounded-xl border border-line bg-surface text-text shadow-xl">
          <div className="flex items-center justify-between border-b border-line px-4 py-3">
            <span className="font-semibold">{t.header.notifications}</span>
            {items?.some((n) => !n.read) && (
              <button type="button" onClick={readAll} className="cursor-pointer text-[13px] font-semibold text-accent hover:underline">
                {t.notifications.readAll}
              </button>
            )}
          </div>
          {items === null ? (
            <p className="px-4 py-8 text-center text-muted">{t.common.loading}</p>
          ) : items.length === 0 ? (
            <p className="px-4 py-8 text-center text-muted">{t.header.noNotifications}</p>
          ) : (
            <ul className="max-h-[60vh] overflow-y-auto">
              {items.map((n) => (
                <li key={n.id}>
                  <Link href={n.link || "#"} onClick={() => setOpen(false)} className={`flex flex-col gap-0.5 border-b border-line px-4 py-3 last:border-0 hover:bg-surface-2 ${n.read ? "" : "bg-accent-soft/60"}`}>
                    <span className="text-[14px]">{fmt(texts[n.type] ?? n.type, statusText(n.params))}</span>
                    <span className="text-[12px] text-muted">{formatDateTime(n.createdAt, locale)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
