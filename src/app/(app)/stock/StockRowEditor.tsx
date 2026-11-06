"use client";

import { Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Pill } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { useI18n } from "@/i18n/client";
import { api } from "@/lib/apiClient";
import type { StockRow } from "@/server/stock";

const input = "h-9 w-24 rounded-md border border-line bg-surface px-2 text-right tabular-nums outline-none focus:border-accent";

/** Ombordagi bitta mahsulot: qoldiq va minimal daraja tahriri. */
export function StockRowEditor({ row }: { row: StockRow }) {
  const { t } = useI18n();
  const router = useRouter();
  const [qty, setQty] = useState(String(row.quantity));
  const [min, setMin] = useState(String(row.minLevel));
  const [busy, setBusy] = useState(false);
  const dirty = qty !== String(row.quantity) || min !== String(row.minLevel);
  const units = t.units as Record<string, string>;

  async function save() {
    setBusy(true);
    await api("/api/v1/stock", { method: "PUT", body: { productId: row.productId, quantity: Number(qty) || 0, minLevel: Number(min) || 0 } });
    setBusy(false);
    router.refresh();
  }

  async function remove() {
    if (!window.confirm(t.stock.removeConfirm)) return;
    await api(`/api/v1/stock/${row.id}`, { method: "DELETE" });
    router.refresh();
  }

  return (
    <tr className="border-b border-line last:border-0">
      <td className="px-4 py-2.5">
        <Link href={`/catalog/${row.productId}`} className="font-medium hover:text-accent">
          {row.name}
        </Link>{" "}
        {row.low && <Pill tone="danger">{t.stock.needed}</Pill>}
        <div className="text-[12px] text-muted">{row.seller.name}</div>
      </td>
      <td className="px-2 py-2.5 text-right">
        <input aria-label={t.stock.quantity} className={input} type="number" min={0} value={qty} onChange={(e) => setQty(e.target.value)} /> <span className="text-[12px] text-muted">{units[row.unit] ?? row.unit}</span>
      </td>
      <td className="px-2 py-2.5 text-right">
        <input aria-label={t.stock.minLevel} className={input} type="number" min={0} value={min} onChange={(e) => setMin(e.target.value)} />
      </td>
      <td className="px-4 py-2.5">
        <div className="flex justify-end gap-1">
          {dirty && (
            <Button type="button" onClick={save} loading={busy} className="h-9">
              {t.products.save}
            </Button>
          )}
          {row.low && (
            <Link href={`/catalog/${row.productId}`} className="inline-flex h-9 items-center rounded-lg px-3 text-[13px] font-semibold text-accent hover:bg-accent-soft">
              {t.stock.order}
            </Link>
          )}
          <button type="button" onClick={remove} aria-label={t.cart.remove} title={t.cart.remove} className="flex size-9 cursor-pointer items-center justify-center rounded-md text-muted hover:bg-danger-soft hover:text-danger">
            <Trash2 size={16} aria-hidden />
          </button>
        </div>
      </td>
    </tr>
  );
}
