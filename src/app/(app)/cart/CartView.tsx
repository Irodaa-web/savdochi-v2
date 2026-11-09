"use client";

import { AlertTriangle, BadgeCheck, Minus, Package, Plus, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { LocationField, type Point } from "@/components/orders/LocationField";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { SelectField, TextField } from "@/components/ui/Field";
import { fmt, useI18n } from "@/i18n/client";
import { api } from "@/lib/apiClient";
import { refreshBadges } from "@/components/shell/useBadges";
import { formatAmount } from "@/lib/catalog";
import { REGION_CODES, type RegionCode } from "@/lib/regions";
import type { CartGroup, CartLine } from "@/server/cart";

type Defaults = { phone: string; region: RegionCode; address: string; point: Point };

export function CartView({ groups, defaults }: { groups: CartGroup[]; defaults: Defaults }) {
  return (
    <div className="flex flex-col gap-6">
      {groups.map((g) => (
        <SellerGroup key={g.seller.id} group={g} defaults={defaults} />
      ))}
    </div>
  );
}

function SellerGroup({ group: g, defaults }: { group: CartGroup; defaults: Defaults }) {
  const { t } = useI18n();
  const [checkout, setCheckout] = useState(false);
  const units = t.units as Record<string, string>;

  return (
    <section className="overflow-hidden rounded-xl border border-line bg-surface">
      <header className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-4 py-3">
        <Link href={`/suppliers/${g.seller.id}`} className="flex items-center gap-1.5 font-semibold hover:text-accent">
          {g.seller.name}
          {g.seller.verified && <BadgeCheck size={16} className="text-accent" aria-label={t.catalog.verified} />}
        </Link>
        {g.discountPercent > 0 && <span className="text-[13px] text-success">{fmt(t.partners.discountNote, { n: g.discountPercent })}</span>}
      </header>

      <ul className="divide-y divide-line">
        {g.lines.map((line) => (
          <CartRow key={line.productId} line={line} unit={units[line.unit] ?? line.unit} />
        ))}
      </ul>

      <div className="flex flex-col gap-1.5 border-t border-line bg-surface-2/50 px-4 py-3 text-[14px]">
        <Row label={t.cart.subtotal} value={g.subtotal} />
        {g.discount > 0 && <Row label={fmt(t.cart.discount, { n: g.discountPercent })} value={-g.discount} />}
        <Row label={t.cart.delivery} value={g.deliveryFee} />
        <Row label={t.cart.total} value={g.total} strong />
        {g.belowMinTotal && (
          <p className="flex items-center gap-1.5 text-[13px] text-danger">
            <AlertTriangle size={14} aria-hidden />
            {fmt(t.cart.minTotal, { sum: formatAmount(g.terms.minOrderTotal) })}
          </p>
        )}
      </div>

      <div className="border-t border-line px-4 py-3">
        {checkout ? (
          <CheckoutForm group={g} defaults={defaults} onCancel={() => setCheckout(false)} />
        ) : (
          <Button type="button" onClick={() => setCheckout(true)} disabled={!g.canOrder}>
            {t.cart.checkout}
          </Button>
        )}
      </div>
    </section>
  );
}

function Row({ label, value, strong }: { label: string; value: number; strong?: boolean }) {
  const { t } = useI18n();
  return (
    <div className={`flex justify-between gap-3 ${strong ? "text-[16px] font-bold" : ""}`}>
      <span className={strong ? "" : "text-muted"}>{label}</span>
      <span className="tabular-nums">
        {formatAmount(value)} {t.common.sum}
      </span>
    </div>
  );
}

function CartRow({ line, unit }: { line: CartLine; unit: string }) {
  const { t } = useI18n();
  const router = useRouter();
  const [qty, setQty] = useState(line.quantity);
  const [busy, setBusy] = useState(false);

  async function save(next: number) {
    setBusy(true);
    await api("/api/v1/cart", { method: "PUT", body: { productId: line.productId, quantity: next } });
    setBusy(false);
    router.refresh();
    refreshBadges();
  }
  const commit = (n: number) => {
    const next = Math.max(0, Math.floor(n));
    setQty(next || line.quantity);
    if (next !== line.quantity) void save(next);
  };

  const problem = line.problem && (t.cart.problems as Record<string, string>)[line.problem];

  return (
    <li className="flex flex-wrap items-center gap-3 px-4 py-3">
      <div className="flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-surface-2 text-muted/60">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {line.image ? <img src={line.image} alt="" className="size-full object-cover" /> : <Package size={22} aria-hidden />}
      </div>
      <div className="min-w-0 flex-1">
        <Link href={`/catalog/${line.productId}`} className="font-semibold hover:text-accent">
          {line.name}
        </Link>
        <div className="text-[13px] text-muted">
          {formatAmount(line.unitPrice)} {t.common.sum} / {unit} · {fmt(t.catalog.minOrder, { n: line.minOrder, unit })}
        </div>
        {problem && <div className="text-[13px] font-medium text-danger">{fmt(problem, { n: line.stock, unit })}</div>}
      </div>
      <div className="flex items-center gap-1" aria-busy={busy}>
        <button type="button" aria-label={t.cart.less} disabled={busy} onClick={() => commit(qty - 1)} className="flex size-8 cursor-pointer items-center justify-center rounded-md border border-line hover:bg-surface-2">
          <Minus size={14} aria-hidden />
        </button>
        <input
          type="number"
          inputMode="numeric"
          aria-label={t.cart.quantity}
          value={qty}
          onChange={(e) => setQty(Number(e.target.value) || 0)}
          onBlur={() => commit(qty)}
          onKeyDown={(e) => e.key === "Enter" && commit(qty)}
          className="h-8 w-16 rounded-md border border-line bg-surface text-center tabular-nums outline-none focus:border-accent"
        />
        <button type="button" aria-label={t.cart.more} disabled={busy} onClick={() => commit(qty + 1)} className="flex size-8 cursor-pointer items-center justify-center rounded-md border border-line hover:bg-surface-2">
          <Plus size={14} aria-hidden />
        </button>
      </div>
      <div className="w-28 text-right font-semibold tabular-nums">
        {formatAmount(line.total)}
      </div>
      <button type="button" aria-label={t.cart.remove} title={t.cart.remove} disabled={busy} onClick={() => save(0)} className="flex size-8 cursor-pointer items-center justify-center rounded-md text-muted hover:bg-danger-soft hover:text-danger">
        <Trash2 size={16} aria-hidden />
      </button>
    </li>
  );
}

function newRequestId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
}

function CheckoutForm({ group: g, defaults, onCancel }: { group: CartGroup; defaults: Defaults; onCancel: () => void }) {
  const { t } = useI18n();
  const router = useRouter();
  const errors = t.errors as Record<string, string>;
  const [form, setForm] = useState({ phone: defaults.phone, region: defaults.region as string, address: defaults.address, paymentMethod: g.terms.paymentMethods[0] ?? "cash", comment: "" });
  const [point, setPoint] = useState<Point>(defaults.point);
  const [fields, setFields] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  // Forma ochiq turganda bitta kalit: qayta bosish yoki tarmoq xatosidan keyin qayta yuborish ikkinchi buyurtma yaratmaydi.
  const [requestId] = useState(newRequestId);
  const set = (k: keyof typeof form) => (e: { target: { value: string } }) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const outsideArea = g.terms.deliveryRegions.length > 0 && !g.terms.deliveryRegions.includes(form.region as RegionCode);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setFields({});
    const res = await api<{ id: string }>("/api/v1/orders", { body: { ...form, requestId, sellerId: g.seller.id, lat: point?.lat ?? null, lng: point?.lng ?? null } });
    if (res.ok) {
      router.push(`/orders/${res.data.id}?placed=1`);
      router.refresh();
      return;
    }
    setBusy(false);
    if (res.fields) setFields(res.fields);
    setError(errors[res.error] ?? errors.SERVER_ERROR!);
  }

  const fe = (k: string) => (fields[k] ? (errors[fields[k]] ?? errors.INVALID_INPUT) : undefined);

  return (
    <form onSubmit={submit} className="flex flex-col gap-4" noValidate>
      <h3 className="font-semibold">{t.checkout.title}</h3>
      {error && <Alert>{error}</Alert>}
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField label={t.auth.phone} value={form.phone} onChange={set("phone")} error={fe("phone")} inputMode="tel" autoComplete="tel" required />
        <SelectField label={t.auth.region} value={form.region} onChange={set("region")} error={fe("region")} options={REGION_CODES.map((r) => ({ value: r, label: t.regions[r] }))} />
      </div>
      {outsideArea && <Alert tone="info">{t.checkout.outsideArea}</Alert>}
      <TextField label={t.checkout.address} value={form.address} onChange={set("address")} error={fe("address")} placeholder={t.checkout.addressPlaceholder} required />
      <LocationField value={point} onChange={setPoint} />
      <SelectField
        label={t.checkout.payment}
        value={form.paymentMethod}
        onChange={set("paymentMethod")}
        error={fe("paymentMethod")}
        options={g.terms.paymentMethods.map((m) => ({ value: m, label: t.payment[m] }))}
      />
      <TextField label={t.checkout.comment} value={form.comment} onChange={set("comment")} maxLength={1000} />
      <p className="text-[13px] text-muted">{fmt(t.checkout.leadDays, { n: g.terms.leadDays })}</p>
      <div className="flex flex-wrap gap-2">
        <Button type="submit" loading={busy}>
          {fmt(t.checkout.submit, { sum: formatAmount(g.total) })}
        </Button>
        <Button type="button" variant="ghost" onClick={onCancel}>
          {t.products.cancel}
        </Button>
      </div>
    </form>
  );
}
