"use client";

import clsx from "clsx";
import { ChevronDown, ListChecks, Pencil, ShoppingCart, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { BulkAddResult, type BulkResult } from "@/components/cart/BulkAddResult";
import { refreshBadges } from "@/components/shell/useBadges";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { fmt, useI18n } from "@/i18n/client";
import { api } from "@/lib/apiClient";
import { formatAmount } from "@/lib/catalog";
import type { OrderListView } from "@/server/lists";

/** Bitta doimiy ro'yxat: bir bosishda savatga, miqdorlarni tahrirlash, nomini o'zgartirish, o'chirish. */
/** lastUsed — serverda formatlangan sana (server va brauzer sanani turlicha yozmasligi uchun). */
export function ListCard({ list, lastUsed }: { list: OrderListView; lastUsed: string | null }) {
  const { t } = useI18n();
  const router = useRouter();
  const units = t.units as Record<string, string>;
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(list.name);
  const [qty, setQty] = useState<Record<string, number>>({});
  const [busy, setBusy] = useState<"cart" | "save" | "delete" | null>(null);
  const [result, setResult] = useState<BulkResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const errors = t.errors as Record<string, string>;
  const q = (id: string, base: number) => qty[id] ?? base;

  async function toCart() {
    setBusy("cart");
    setError(null);
    const res = await api<BulkResult>(`/api/v1/lists/${list.id}/cart`, { method: "POST" });
    setBusy(null);
    if (res.ok) {
      setResult(res.data);
      refreshBadges();
      router.refresh();
    } else setError(errors[res.error] ?? errors.SERVER_ERROR!);
  }

  async function save() {
    setBusy("save");
    setError(null);
    const res = await api(`/api/v1/lists/${list.id}`, { method: "PATCH", body: { name, items: list.items.map((i) => ({ productId: i.productId, quantity: q(i.productId, i.quantity) })) } });
    setBusy(null);
    if (res.ok) {
      setEditing(false);
      setQty({});
      router.refresh();
    } else setError(errors[res.fields?.items ?? res.fields?.name ?? res.error] ?? errors.SERVER_ERROR!);
  }

  async function remove() {
    if (!window.confirm(fmt(t.lists.confirmDelete, { name: list.name }))) return;
    setBusy("delete");
    const res = await api(`/api/v1/lists/${list.id}`, { method: "DELETE" });
    setBusy(null);
    if (res.ok) router.refresh();
  }

  const unavailable = list.items.filter((i) => !i.available).length;

  return (
    <li className="glass-card flex flex-col gap-3 rounded-2xl p-4">
      <div className="flex flex-wrap items-start gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-accent-soft text-accent">
          <ListChecks size={20} aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          {editing ? (
            <input value={name} onChange={(e) => setName(e.target.value)} maxLength={80} aria-label={t.lists.name} className="h-9 w-full rounded-lg border border-line bg-surface px-3 font-semibold outline-none focus:border-accent" />
          ) : (
            <h2 className="font-semibold break-words">{list.name}</h2>
          )}
          <p className="mt-0.5 truncate text-[12px] text-muted">
            {fmt(t.lists.itemsCount, { n: list.items.length })} · {list.sellers.join(", ") || "—"}
          </p>
          <p className="text-[12px] text-muted">{lastUsed ? fmt(t.lists.lastUsed, { date: lastUsed }) : t.lists.neverUsed}</p>
        </div>
        <div className="flex basis-full items-baseline gap-2 border-t border-line pt-2 sm:block sm:basis-auto sm:border-0 sm:pt-0 sm:text-right">
          <span className="block text-[12px] text-muted">{t.lists.estimate}</span>
          <b className="tabular-nums">
            {formatAmount(list.estimate)} {t.common.sum}
          </b>
        </div>
      </div>

      {result && <BulkAddResult result={result} />}
      {error && <Alert>{error}</Alert>}
      {unavailable > 0 && !result && <p className="text-[12px] text-danger">{fmt(t.lists.unavailable, { n: unavailable })}</p>}

      <div className="flex items-center gap-2">
        <Button type="button" onClick={toCart} loading={busy === "cart"} disabled={editing}>
          <ShoppingCart size={16} aria-hidden />
          {t.lists.toCart}
        </Button>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open || editing}
          className="inline-flex h-10 cursor-pointer items-center gap-1.5 rounded-xl px-3 text-[14px] font-semibold text-muted hover:bg-surface-2 hover:text-text"
        >
          {t.lists.show}
          <ChevronDown size={15} aria-hidden className={clsx("transition-transform", (open || editing) && "rotate-180")} />
        </button>
        <span className="ml-auto flex gap-1">
          {!editing && (
            <button type="button" onClick={() => setEditing(true)} aria-label={t.lists.edit} title={t.lists.edit} className="flex size-9 cursor-pointer items-center justify-center rounded-lg text-muted hover:bg-surface-2 hover:text-accent">
              <Pencil size={16} aria-hidden />
            </button>
          )}
          <button type="button" onClick={remove} disabled={busy === "delete"} aria-label={t.lists.delete} title={t.lists.delete} className="flex size-9 cursor-pointer items-center justify-center rounded-lg text-muted hover:bg-danger-soft hover:text-danger">
            <Trash2 size={16} aria-hidden />
          </button>
        </span>
      </div>

      {(open || editing) && (
        <ul className="flex flex-col divide-y divide-line rounded-xl border border-line">
          {list.items.map((i) => {
            const n = q(i.productId, i.quantity);
            return (
              <li key={i.productId} className={clsx("flex items-center gap-3 px-3 py-2 text-[14px]", (!i.available || n === 0) && "opacity-60")}>
                <span className="min-w-0 flex-1">
                  <span className={clsx("block truncate font-medium", n === 0 && "line-through")}>{i.name}</span>
                  <span className="block truncate text-[12px] text-muted">
                    {i.seller}
                    {!i.available && <b className="text-danger"> · {t.restock.unavailable}</b>}
                  </span>
                </span>
                {editing ? (
                  <input
                    type="number"
                    inputMode="numeric"
                    min={0}
                    value={n}
                    aria-label={fmt(t.orderEdit.qtyFor, { name: i.name })}
                    onChange={(e) => setQty((all) => ({ ...all, [i.productId]: Math.max(0, Math.floor(Number(e.target.value)) || 0) }))}
                    className="h-8 w-20 rounded-lg border border-line bg-surface text-center tabular-nums outline-none focus:border-accent"
                  />
                ) : (
                  <span className="tabular-nums">{n}</span>
                )}
                <span className="w-12 text-[12px] text-muted">{units[i.unit] ?? i.unit}</span>
              </li>
            );
          })}
        </ul>
      )}
      {editing && (
        <div className="flex flex-wrap items-center gap-2">
          <Button type="button" onClick={save} loading={busy === "save"}>
            {t.lists.save}
          </Button>
          <Button
            type="button"
            variant="ghost"
            onClick={() => {
              setEditing(false);
              setQty({});
              setName(list.name);
            }}
          >
            {t.common.cancel}
          </Button>
          <span className="text-[12px] text-muted">{t.lists.zeroHint}</span>
        </div>
      )}
    </li>
  );
}
