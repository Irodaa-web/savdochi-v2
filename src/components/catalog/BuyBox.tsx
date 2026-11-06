"use client";

import { Heart, Minus, Plus, ShoppingCart } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { fmt, useI18n } from "@/i18n/client";
import { api } from "@/lib/apiClient";
import { refreshBadges } from "@/components/shell/useBadges";
import { formatAmount, unitPriceFor, type PriceTier } from "@/lib/catalog";

type Props = { productId: string; price: number; tiers: PriceTier[]; minOrder: number; stock: number; unit: string; saved: boolean };

/** Mahsulot sahifasidagi xarid bloki: miqdor, jami narx, savatga qo'shish, saqlash. */
export function BuyBox({ productId, price, tiers, minOrder, stock, unit, saved: savedInitial }: Props) {
  const { t } = useI18n();
  const router = useRouter();
  const [qty, setQty] = useState(minOrder);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(savedInitial);
  const [message, setMessage] = useState<{ tone: "success" | "danger"; text: string } | null>(null);
  const available = stock >= minOrder;
  const unitPrice = unitPriceFor(qty, price, tiers);
  const clamp = (n: number) => Math.max(minOrder, Math.min(stock, Math.floor(n) || minOrder));

  async function add() {
    setBusy(true);
    setMessage(null);
    const res = await api("/api/v1/cart", { method: "PUT", body: { productId, quantity: qty, add: true } });
    setBusy(false);
    if (res.ok) {
      setMessage({ tone: "success", text: t.cart.added });
      refreshBadges();
      router.refresh();
    } else {
      const errors = t.errors as Record<string, string>;
      setMessage({ tone: "danger", text: errors[res.error] ?? errors.SERVER_ERROR! });
    }
  }

  async function toggleSave() {
    const res = await api<{ saved: boolean }>("/api/v1/favorites", { body: { productId } });
    if (res.ok) setSaved(res.data.saved);
  }

  return (
    <div className="flex flex-col gap-3">
      {available && (
        <>
          <div className="flex items-center gap-2">
            <button type="button" aria-label={t.cart.less} onClick={() => setQty((q) => clamp(q - 1))} className="flex size-10 cursor-pointer items-center justify-center rounded-lg border border-line hover:bg-surface-2">
              <Minus size={16} aria-hidden />
            </button>
            <input
              type="number"
              inputMode="numeric"
              aria-label={t.cart.quantity}
              value={qty}
              min={minOrder}
              max={stock}
              onChange={(e) => setQty(Number(e.target.value) || 0)}
              onBlur={() => setQty((q) => clamp(q))}
              className="h-10 w-24 rounded-lg border border-line bg-surface text-center tabular-nums outline-none focus:border-accent"
            />
            <button type="button" aria-label={t.cart.more} onClick={() => setQty((q) => clamp(q + 1))} className="flex size-10 cursor-pointer items-center justify-center rounded-lg border border-line hover:bg-surface-2">
              <Plus size={16} aria-hidden />
            </button>
            <span className="text-[13px] text-muted">{unit}</span>
          </div>
          <div className="flex items-baseline justify-between text-[13px]">
            <span className="text-muted">{fmt(t.cart.lineTotal, { price: formatAmount(unitPrice) })}</span>
            <span className="text-lg font-bold tabular-nums">{formatAmount(unitPrice * qty)} {t.common.sum}</span>
          </div>
        </>
      )}
      <div className="flex gap-2">
        <Button type="button" onClick={add} loading={busy} disabled={!available || qty < minOrder || qty > stock} className="flex-1" size="lg">
          <ShoppingCart size={18} aria-hidden />
          {t.catalog.addToCart}
        </Button>
        <Button type="button" variant="secondary" size="lg" onClick={toggleSave} aria-pressed={saved} aria-label={saved ? t.favorites.remove : t.favorites.add} title={saved ? t.favorites.remove : t.favorites.add}>
          <Heart size={18} aria-hidden className={saved ? "fill-accent text-accent" : undefined} />
        </Button>
      </div>
      {message && (
        <Alert tone={message.tone}>
          {message.text}
          {message.tone === "success" && (
            <>
              {" "}
              <Link href="/cart" className="font-semibold underline">
                {t.cart.open}
              </Link>
            </>
          )}
        </Alert>
      )}
    </div>
  );
}
