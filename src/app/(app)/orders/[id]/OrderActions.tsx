"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ActionButton } from "@/components/ui/ActionButton";
import { Button } from "@/components/ui/Button";
import { SelectField, TextField } from "@/components/ui/Field";
import { fmt, useI18n } from "@/i18n/client";
import { api } from "@/lib/apiClient";
import { ORDER_TRANSITIONS, PAYMENT_STATUSES, type OrderStatus, type PaymentStatus } from "@/lib/orders";

/** Holatni o'zgartirish tugmalari (rolga qarab) va kompaniya uchun to'lovni qayd etish. */
export function OrderActions({
  id,
  role,
  status,
  creditPending = false,
  paymentStatus,
  paidAmount,
  total,
  deliveryDate,
}: {
  id: string;
  role: "buyer" | "seller";
  status: OrderStatus;
  creditPending?: boolean;
  paymentStatus: PaymentStatus;
  paidAmount: number;
  total: number;
  deliveryDate: string | null;
}) {
  const { t } = useI18n();
  const next = ORDER_TRANSITIONS[role][status] ?? [];

  return (
    <div className="flex flex-col gap-4">
      {next.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {next.map((s) => (
            <ActionButton
              key={s}
              path={`/api/v1/orders/${id}`}
              method="PATCH"
              body={{ status: s }}
              variant={s === "cancelled" ? "secondary" : "primary"}
              confirm={s === "cancelled" ? t.orders.cancelConfirm : undefined}
            >
              {s === "confirmed" && creditPending ? t.orders.approveCredit : t.orders.actions[s]}
            </ActionButton>
          ))}
        </div>
      )}
      {role === "seller" && status !== "cancelled" && <PaymentForm id={id} paymentStatus={paymentStatus} paidAmount={paidAmount} total={total} deliveryDate={deliveryDate} />}
      {role === "buyer" && (
        <ActionButton path={`/api/v1/orders/${id}/reorder`} variant="secondary" onDone={() => (window.location.href = "/cart")}>
          {t.orders.reorder}
        </ActionButton>
      )}
    </div>
  );
}

function PaymentForm({ id, paymentStatus, paidAmount, total, deliveryDate }: { id: string; paymentStatus: PaymentStatus; paidAmount: number; total: number; deliveryDate: string | null }) {
  const { t } = useI18n();
  const router = useRouter();
  const [status, setStatus] = useState<PaymentStatus>(paymentStatus);
  const [amount, setAmount] = useState(String(paidAmount || ""));
  const [date, setDate] = useState(deliveryDate ? deliveryDate.slice(0, 10) : "");
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);

  async function save() {
    setBusy(true);
    setSaved(false);
    const res = await api(`/api/v1/orders/${id}`, { method: "PATCH", body: { paymentStatus: status, paidAmount: status === "partial" ? Number(amount) || 0 : undefined, deliveryDate: date || null } });
    setBusy(false);
    if (res.ok) {
      setSaved(true);
      router.refresh();
    }
  }

  return (
    <div className="grid gap-3 rounded-lg bg-surface-2 p-3 sm:grid-cols-3 sm:items-end">
      <SelectField label={t.orders.payment} value={status} onChange={(e) => setStatus(e.target.value as PaymentStatus)} options={PAYMENT_STATUSES.map((s) => ({ value: s, label: t.paymentStatus[s] }))} />
      {status === "partial" ? (
        <TextField label={fmt(t.orders.paidAmount, { total: total.toLocaleString("ru-RU") })} type="number" inputMode="numeric" min={0} max={total} value={amount} onChange={(e) => setAmount(e.target.value)} />
      ) : (
        <span className="hidden sm:block" />
      )}
      <TextField label={t.orders.deliveryDate} type="date" value={date} onChange={(e) => setDate(e.target.value)} />
      <div className="flex items-center gap-3 sm:col-span-3">
        <Button type="button" variant="secondary" onClick={save} loading={busy}>
          {t.products.save}
        </Button>
        {saved && <span className="text-[13px] text-success">{t.products.saved}</span>}
      </div>
    </div>
  );
}
