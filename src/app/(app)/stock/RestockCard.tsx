"use client";

import clsx from "clsx";
import { PackagePlus } from "lucide-react";
import { useState } from "react";
import { BulkAddResult, type BulkResult } from "@/components/cart/BulkAddResult";
import { refreshBadges } from "@/components/shell/useBadges";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { fmt, useI18n } from "@/i18n/client";
import { api } from "@/lib/apiClient";
import { formatAmount } from "@/lib/catalog";
import type { RestockLine } from "@/server/stock";

/**
 * Kam qolganlarni bir bosishda buyurtma qilish: tavsiya etilgan miqdorlar (qoldiqni minimal darajaning
 * 2 baravariga yetkazadi) yetkazib beruvchilar bo'yicha. Miqdorni o'zgartirish, keraksizini olib tashlash mumkin.
 */
export function RestockCard({ lines }: { lines: RestockLine[] }) {
  const { t } = useI18n();
  const units = t.units as Record<string, string>;
  const [qty, setQty] = useState<Record<string, number>>(() => Object.fromEntries(lines.map((l) => [l.productId, l.suggested])));
  const [picked, setPicked] = useState<Record<string, boolean>>(() => Object.fromEntries(lines.map((l) => [l.productId, l.status === "ok"])));
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<BulkResult | null>(null);
  const [error, setError] = useState(false);

  const chosen = lines.filter((l) => l.status === "ok" && picked[l.productId]);
  const total = chosen.reduce((s, l) => s + l.unitPrice * (qty[l.productId] ?? l.suggested), 0);
  const groups = [...lines.reduce((m, l) => m.set(l.seller.id, [...(m.get(l.seller.id) ?? []), l]), new Map<string, RestockLine[]>()).values()];

  async function add() {
    setBusy(true);
    setError(false);
    const res = await api<BulkResult>("/api/v1/cart/bulk", { body: { items: chosen.map((l) => ({ productId: l.productId, quantity: qty[l.productId] ?? l.suggested })) } });
    setBusy(false);
    if (res.ok) {
      setResult(res.data);
      refreshBadges();
    } else setError(true);
  }

  return (
    <section id="restock" className="flex scroll-mt-24 flex-col gap-4 glass-card rounded-2xl p-5">
      <div className="flex flex-wrap items-start gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-danger-soft text-danger">
          <PackagePlus size={20} aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="font-semibold">{t.restock.title}</h2>
          <p className="text-[13px] text-muted">{t.restock.hint}</p>
        </div>
      </div>
      {result && <BulkAddResult result={result} />}
      {error && <Alert>{t.errors.SERVER_ERROR}</Alert>}

      {groups.map((group) => (
        <div key={group[0]!.seller.id} className="flex flex-col gap-1">
          <p className="text-[12px] font-semibold tracking-wider text-muted uppercase">{group[0]!.seller.name}</p>
          <ul className="flex flex-col divide-y divide-line rounded-xl border border-line">
            {group.map((l) => {
              const ok = l.status === "ok";
              const on = ok && picked[l.productId];
              const unit = units[l.unit] ?? l.unit;
              return (
                <li key={l.productId} className={clsx("flex flex-wrap items-center gap-x-3 gap-y-2 px-3 py-2.5", !ok && "opacity-60")}>
                  <label className="flex min-w-0 flex-1 cursor-pointer items-center gap-3">
                    <input
                      type="checkbox"
                      checked={on}
                      disabled={!ok}
                      onChange={(e) => setPicked((all) => ({ ...all, [l.productId]: e.target.checked }))}
                      className="size-4 shrink-0 accent-[var(--c-accent)]"
                    />
                    <span className="min-w-0">
                      <span className="block truncate text-[14px] font-medium">{l.name}</span>
                      <span className="block text-[12px] text-muted">
                        {fmt(t.restock.have, { have: l.have, min: l.minLevel, unit })}
                        {!ok && <b className="text-danger"> · {l.status === "outOfStock" ? t.catalog.outOfStock : t.restock.unavailable}</b>}
                      </span>
                    </span>
                  </label>
                  {ok && (
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        inputMode="numeric"
                        aria-label={fmt(t.orderEdit.qtyFor, { name: l.name })}
                        value={qty[l.productId]}
                        min={l.minOrder}
                        max={l.available}
                        disabled={!on}
                        onChange={(e) => setQty((all) => ({ ...all, [l.productId]: Number(e.target.value) || 0 }))}
                        onBlur={() => setQty((all) => ({ ...all, [l.productId]: Math.min(l.available, Math.max(l.minOrder, all[l.productId] ?? 0)) }))}
                        className="h-8 w-20 rounded-lg border border-line bg-surface text-center text-[14px] tabular-nums outline-none focus:border-accent disabled:opacity-50"
                      />
                      <span className="w-12 text-[12px] text-muted">{unit}</span>
                      <span className="w-28 text-right text-[13px] font-semibold tabular-nums">{formatAmount(l.unitPrice * (qty[l.productId] ?? 0))}</span>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      ))}

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line pt-3">
        <span className="text-[14px]">
          {t.restock.total}: <b className="tabular-nums">{formatAmount(total)} {t.common.sum}</b>
        </span>
        <Button type="button" onClick={add} loading={busy} disabled={!chosen.length}>
          <PackagePlus size={17} aria-hidden />
          {fmt(t.restock.addAll, { n: chosen.length })}
        </Button>
      </div>
    </section>
  );
}
