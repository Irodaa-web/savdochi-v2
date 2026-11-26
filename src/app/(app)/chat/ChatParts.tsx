"use client";

import { Check, CheckCheck, ReceiptText, Search, ShoppingCart } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ProductImage } from "@/components/catalog/ProductImage";
import { StatusPill } from "@/components/orders/StatusPill";
import { useBadges } from "@/components/shell/useBadges";
import { Modal } from "@/components/ui/Modal";
import { useI18n } from "@/i18n/client";
import { fmt, TIME_ZONE } from "@/i18n/format";
import { api } from "@/lib/apiClient";
import { formatAmount } from "@/lib/catalog";
import type { OrderCardView, ProductCardView } from "@/server/chat";

/** Kun kaliti (Toshkent vaqti bilan) — xabarlarni kunlar bo'yicha ajratish uchun. */
export const dayKey = (iso: string) => new Date(iso).toLocaleDateString("en-CA", { timeZone: TIME_ZONE });
export const timeOf = (iso: string) => new Date(iso).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: TIME_ZONE });

/** ✓ — yuborildi, ✓✓ — suhbatdosh o'qidi. */
export function Ticks({ read }: { read: boolean }) {
  const { t } = useI18n();
  return read ? <CheckCheck size={15} aria-label={t.chat.read} className="text-sky-200" /> : <Check size={15} aria-label={t.chat.sent} className="opacity-75" />;
}

/** Chatdagi mahsulot kartasi: rasm, narx; do'kon uchun "Savatga qo'shish" (minimal miqdor bilan). */
export function ProductCard({ p, buyer }: { p: ProductCardView; buyer: boolean }) {
  const { t } = useI18n();
  const [, refreshBadges] = useBadges();
  const [state, setState] = useState<"idle" | "busy" | "added" | "error">("idle");
  const unit = (t.units as Record<string, string>)[p.unit] ?? p.unit;

  async function add() {
    setState("busy");
    const res = await api("/api/v1/cart", { method: "PUT", body: { productId: p.id, quantity: p.minOrder, add: true } });
    setState(res.ok ? "added" : "error");
    if (res.ok) refreshBadges();
  }

  return (
    <div className="flex w-64 max-w-full flex-col overflow-hidden rounded-xl bg-surface text-text ring-1 ring-line">
      <Link href={`/catalog/${p.id}`} className="block h-28 overflow-hidden">
        <ProductImage src={p.image} name={p.name} category={p.category} sizes="256px" className="h-28 w-full" />
      </Link>
      <div className="flex flex-col gap-1.5 p-3">
        <Link href={`/catalog/${p.id}`} className="line-clamp-2 text-[14px] leading-snug font-semibold hover:text-accent">
          {p.name}
        </Link>
        <span className="text-[13px]">
          <b className={p.oldPrice ? "text-danger" : undefined}>{formatAmount(p.price)}</b> <span className="text-muted">{fmt(t.catalog.perUnit, { unit })}</span>
          {p.oldPrice && <s className="ml-1.5 text-[12px] text-muted">{formatAmount(p.oldPrice)}</s>}
        </span>
        <span className="text-[12px] text-muted">{p.available ? fmt(t.catalog.minOrder, { n: p.minOrder, unit }) : t.chat.unavailable}</span>
        {buyer && p.available ? (
          <button
            type="button"
            onClick={add}
            disabled={state === "busy" || state === "added"}
            className="mt-1 inline-flex h-9 cursor-pointer items-center justify-center gap-1.5 rounded-lg bg-accent px-3 text-[13px] font-semibold text-accent-fg hover:opacity-90 disabled:opacity-70"
          >
            <ShoppingCart size={15} aria-hidden />
            {state === "added" ? t.chat.added : t.chat.addToCart}
          </button>
        ) : (
          <Link href={`/catalog/${p.id}`} className="mt-1 inline-flex h-9 items-center justify-center rounded-lg border border-line px-3 text-[13px] font-semibold hover:border-accent">
            {t.chat.view}
          </Link>
        )}
        {state === "error" && <span className="text-[12px] text-danger">{t.errors.SERVER_ERROR}</span>}
      </div>
    </div>
  );
}

/** Chatdagi buyurtma kartasi: raqam, holat, summa — bosilsa buyurtma sahifasi. */
export function OrderCard({ o }: { o: OrderCardView }) {
  const { t } = useI18n();
  return (
    <Link href={`/orders/${o.id}`} className="flex w-64 max-w-full flex-col gap-2 rounded-xl bg-surface p-3 text-text ring-1 ring-line hover:ring-accent/50">
      <span className="flex items-center justify-between gap-2">
        <span className="flex items-center gap-1.5 font-semibold">
          <ReceiptText size={16} className="text-accent" aria-hidden />№{o.number}
        </span>
        <StatusPill status={o.status} t={t} />
      </span>
      <span className="flex items-baseline justify-between gap-2 text-[13px]">
        <span className="text-muted">{fmt(t.chat.items, { n: o.items })}</span>
        <b className="tabular-nums">
          {formatAmount(o.total)} {t.common.sum}
        </b>
      </span>
    </Link>
  );
}

type PickProduct = { id: string; name: string; images: string[]; price: number; category: string };
type PickOrder = { id: string; number: number; status: OrderCardView["status"]; total: number; createdAt: string };

/** Chatga mahsulot yoki buyurtma biriktirish oynasi. */
export function Picker({ kind, onClose, onPick, sellerId, partnerId, seller }: { kind: "product" | "order" | null; onClose: () => void; onPick: (payload: { productId?: string; orderId?: string }) => void; sellerId: string; partnerId: string; seller: boolean }) {
  const { t } = useI18n();
  const [products, setProducts] = useState<PickProduct[] | null>(null);
  const [orders, setOrders] = useState<PickOrder[] | null>(null);
  const [q, setQ] = useState("");

  useEffect(() => {
    if (kind === "product" && products === null) {
      // Kompaniya — o'z mahsulotlari; do'kon — suhbatdagi kompaniyaning katalogdagi mahsulotlari.
      const url = seller ? "/api/v1/seller/products" : `/api/v1/products?seller=${sellerId}`;
      void api<PickProduct[] | { items: PickProduct[] }>(url).then((res) => setProducts(res.ok ? (Array.isArray(res.data) ? res.data : res.data.items) : []));
    }
    if (kind === "order" && orders === null) void api<PickOrder[]>(`/api/v1/orders?partner=${partnerId}`).then((res) => setOrders(res.ok ? res.data : []));
  }, [kind, products, orders, seller, sellerId, partnerId]);

  const shown = useMemo(() => (products ?? []).filter((p) => p.name.toLowerCase().includes(q.trim().toLowerCase())).slice(0, 50), [products, q]);
  const row = "flex w-full cursor-pointer items-center gap-3 rounded-xl px-2 py-2 text-left hover:bg-accent-soft/60";

  return (
    <Modal open={kind !== null} onClose={onClose} title={kind === "order" ? t.chat.pickOrder : t.chat.pickProduct}>
      {kind === "product" && (
        <div className="flex flex-col gap-3">
          <label className="flex h-10 items-center gap-2 rounded-xl border border-line px-3 focus-within:border-accent">
            <Search size={16} className="text-muted" aria-hidden />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t.chat.searchProduct} aria-label={t.chat.searchProduct} className="focus-none min-w-0 flex-1 bg-transparent outline-none" />
          </label>
          <div className="flex max-h-80 flex-col overflow-y-auto">
            {products === null ? (
              <p className="py-6 text-center text-muted">…</p>
            ) : shown.length === 0 ? (
              <p className="py-6 text-center text-muted">{t.chat.noProducts}</p>
            ) : (
              shown.map((p) => (
                <button key={p.id} type="button" className={row} onClick={() => onPick({ productId: p.id })}>
                  <span className="size-11 shrink-0 overflow-hidden rounded-lg">
                    <ProductImage src={p.images[0]} name={p.name} category={p.category} sizes="44px" className="size-11" />
                  </span>
                  <span className="min-w-0 flex-1 truncate text-[14px] font-medium">{p.name}</span>
                  <span className="text-[13px] font-semibold tabular-nums">{formatAmount(p.price)}</span>
                </button>
              ))
            )}
          </div>
        </div>
      )}
      {kind === "order" && (
        <div className="flex max-h-80 flex-col overflow-y-auto">
          {orders === null ? (
            <p className="py-6 text-center text-muted">…</p>
          ) : orders.length === 0 ? (
            <p className="py-6 text-center text-muted">{t.chat.noOrders}</p>
          ) : (
            orders.slice(0, 50).map((o) => (
              <button key={o.id} type="button" className={row} onClick={() => onPick({ orderId: o.id })}>
                <ReceiptText size={18} className="shrink-0 text-accent" aria-hidden />
                <span className="font-semibold tabular-nums">№{o.number}</span>
                <StatusPill status={o.status} t={t} />
                <span className="ml-auto text-[13px] font-semibold tabular-nums">{formatAmount(o.total)}</span>
              </button>
            ))
          )}
        </div>
      )}
    </Modal>
  );
}

export const EMOJIS = ["👍", "🙏", "😊", "😂", "👌", "🤝", "✅", "❌", "🔥", "💯", "🎉", "❤️", "🙂", "😉", "🤔", "😅", "👏", "💪", "📦", "🚚", "💰", "🧾", "📞", "⏰"];
