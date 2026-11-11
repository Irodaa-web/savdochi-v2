"use client";

import { CreditCard } from "lucide-react";
import { useState } from "react";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { fmt, useI18n } from "@/i18n/client";
import { api } from "@/lib/apiClient";
import { formatAmount } from "@/lib/catalog";

const NAMES = { payme: "Payme", click: "Click" } as const;

/** Do'kon: buyurtmaning qolgan summasini Payme yoki Click orqali to'lash. */
export function PayOnline({ orderId, left, methods }: { orderId: string; left: number; methods: ("payme" | "click")[] }) {
  const { t } = useI18n();
  const errors = t.errors as Record<string, string>;
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function pay(provider: "payme" | "click") {
    setBusy(provider);
    setError(null);
    const res = await api<{ url: string }>(`/api/v1/orders/${orderId}/pay`, { body: { provider } });
    if (res.ok) {
      window.location.href = res.data.url;
      return;
    }
    setBusy(null);
    setError(errors[res.error] ?? errors.SERVER_ERROR!);
  }

  return (
    <div className="flex flex-col gap-2.5 rounded-lg bg-surface-2 p-3">
      <span className="flex items-center gap-2 text-[14px] font-semibold">
        <CreditCard size={16} aria-hidden />
        {fmt(t.onlinePay.left, { sum: formatAmount(left) })}
      </span>
      {error && <Alert>{error}</Alert>}
      <div className="flex flex-wrap gap-2">
        {methods.map((m) => (
          <Button key={m} type="button" onClick={() => pay(m)} loading={busy === m} disabled={busy !== null}>
            {fmt(t.onlinePay.payWith, { provider: NAMES[m] })}
          </Button>
        ))}
      </div>
    </div>
  );
}
