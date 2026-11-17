"use client";

import { X } from "lucide-react";
import { useEffect, useId, useRef, type ReactNode } from "react";
import { useI18n } from "@/i18n/client";

/**
 * Umumiy oyna. Brauzerning <dialog> elementi ishlatiladi: fokus oyna ichida qoladi,
 * Esc bilan yopiladi, fon bosilganda ham yopiladi.
 */
export function Modal({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: ReactNode }) {
  const { t } = useI18n();
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      onClose={onClose}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="m-auto w-[min(calc(100vw-2rem),440px)] rounded-2xl border border-line bg-surface p-0 text-text shadow-2xl backdrop:bg-black/45 backdrop:backdrop-blur-[2px]"
    >
      <div className="flex items-start justify-between gap-3 px-5 pt-5">
        <h2 id={titleId} className="text-[17px] leading-snug font-bold">
          {title}
        </h2>
        <button
          type="button"
          onClick={onClose}
          aria-label={t.common.close}
          className="-mt-1 -mr-1 flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-lg text-muted hover:bg-surface-2 hover:text-text"
        >
          <X size={18} aria-hidden />
        </button>
      </div>
      <div className="px-5 pt-3 pb-5">{children}</div>
    </dialog>
  );
}
