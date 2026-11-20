"use client";

import clsx from "clsx";
import { Minus, PencilLine, Plus, RotateCcw, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { fmt, useI18n } from "@/i18n/client";
import { api } from "@/lib/apiClient";
import { formatAmount } from "@/lib/catalog";

type Item = { productId: string; name: string; unit: string; quantity: number; unitPrice: number };

/**
 * Kompaniya: yangi buyurtmani tasdiqlashdan oldin tahrirlash — miqdorni kamaytirish yoki qatorni olib tashlash.
 * Yangi jami summa darhol ko'rinadi; do'konga sabab bilan xabar boradi.
 */
export function EditOrder({ orderId, items, discountPercent, deliveryFee }: { orderId: string; items: Item[]; discountPercent: number; deliveryFee: number }) {
  const { t } = useI18n();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [qty, setQty] = useState<Record<string, number>>({});
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const q = (i: Item) => qty[i.productId] ?? i.quantity;
  const set = (i: Item, n: number) => setQty((all) => ({ ...all, [i.productId]: Math.max(0, Math.min(i.quantity, Math.floor(n) || 0)) }));
  const subtotal = items.reduce((s, i) => s + i.unitPrice * q(i), 0);
  const total = subtotal - Math.round((subtotal * discountPercent) / 100) + deliveryFee;
  const changed = items.some((i) => q(i) !== i.quantity);
  const empty = items.every((i) => q(i) === 0);

  function show() {
    setQty({});
    setReason("");
    setError(null);
    setOpen(true);
  }

  async function save() {
    setBusy(true);
    setError(null);
    const res = await api(`/api/v1/orders/${orderId}/edit`, { body: { items: items.map((i) => ({ productId: i.productId, quantity: q(i) })), reason } });
    setBusy(false);
    if (res.ok) {
      setOpen(false);
      router.refresh();
      return;
    }
    const errors = t.errors as Record<string, string>;
    const field = res.fields?.items;
    setError((field && errors[field]) || errors[res.error] || errors.SERVER_ERROR!);
  }

  const units = t.units as Record<string, string>;

  return (
    <>
      <Button type="button" variant="secondary" onClick={show} className="w-full">
        <PencilLine size={16} aria-hidden />
        {t.orderEdit.button}
      </Button>
      <Modal open={open} onClose={() => setOpen(false)} title={t.orderEdit.title}>
        <div className="flex flex-col gap-4">
          <p className="text-[13px] text-muted">{t.orderEdit.hint}</p>
          {error && <Alert>{error}</Alert>}
          <ul className="flex flex-col divide-y divide-line rounded-xl border border-line">
            {items.map((i) => {
              const n = q(i);
              const unit = units[i.unit] ?? i.unit;
              return (
                <li key={i.productId} className={clsx("flex flex-wrap items-center gap-x-3 gap-y-2 px-3 py-2.5", n === 0 && "bg-danger-soft/40")}>
                  <div className="min-w-0 flex-1">
                    <p className={clsx("truncate text-[14px] font-medium", n === 0 && "text-muted line-through")}>{i.name}</p>
                    <p className="text-[12px] text-muted">
                      {formatAmount(i.unitPrice)} × {n} {unit}
                      {n !== i.quantity && n > 0 && <span className="text-accent"> · {fmt(t.orderEdit.was, { n: i.quantity })}</span>}
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    <button type="button" aria-label={t.cart.less} onClick={() => set(i, n - 1)} disabled={n === 0} className="flex size-8 cursor-pointer items-center justify-center rounded-lg border border-line hover:bg-surface-2 disabled:opacity-40">
                      <Minus size={14} aria-hidden />
                    </button>
                    <input
                      type="number"
                      inputMode="numeric"
                      aria-label={fmt(t.orderEdit.qtyFor, { name: i.name })}
                      value={n}
                      min={0}
                      max={i.quantity}
                      onChange={(e) => set(i, Number(e.target.value))}
                      className="h-8 w-16 rounded-lg border border-line bg-surface text-center text-[14px] tabular-nums outline-none focus:border-accent"
                    />
                    <button type="button" aria-label={t.cart.more} onClick={() => set(i, n + 1)} disabled={n >= i.quantity} className="flex size-8 cursor-pointer items-center justify-center rounded-lg border border-line hover:bg-surface-2 disabled:opacity-40">
                      <Plus size={14} aria-hidden />
                    </button>
                    {n > 0 ? (
                      <button type="button" aria-label={fmt(t.orderEdit.remove, { name: i.name })} title={fmt(t.orderEdit.remove, { name: i.name })} onClick={() => set(i, 0)} className="flex size-8 cursor-pointer items-center justify-center rounded-lg text-danger hover:bg-danger-soft">
                        <Trash2 size={15} aria-hidden />
                      </button>
                    ) : (
                      <button type="button" aria-label={t.orderEdit.restore} title={t.orderEdit.restore} onClick={() => set(i, i.quantity)} className="flex size-8 cursor-pointer items-center justify-center rounded-lg text-accent hover:bg-accent-soft">
                        <RotateCcw size={15} aria-hidden />
                      </button>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
          <label className="flex flex-col gap-1.5">
            <span className="text-[13px] font-medium">{t.orderEdit.reason}</span>
            <textarea
              rows={2}
              maxLength={300}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder={t.orderEdit.reasonPlaceholder}
              className="rounded-lg border border-line bg-surface px-3 py-2 text-[14px] outline-none focus:border-accent"
            />
          </label>
          <div className="flex items-center justify-between rounded-xl bg-surface-2/70 px-3 py-2.5">
            <span className="text-[13px] text-muted">{t.orderEdit.newTotal}</span>
            <span className="font-bold tabular-nums">
              {formatAmount(total)} {t.common.sum}
            </span>
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              {t.common.cancel}
            </Button>
            <Button type="button" onClick={save} loading={busy} disabled={!changed || empty}>
              {t.orderEdit.save}
            </Button>
          </div>
          {empty && <p className="text-[12px] text-danger">{t.errors.editEmpty}</p>}
        </div>
      </Modal>
    </>
  );
}
