"use client";

import { Send } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { useI18n } from "@/i18n/client";
import { fmt } from "@/i18n/format";
import { api } from "@/lib/apiClient";
import { formatAmount } from "@/lib/catalog";

const MONTHS = [1, 3, 12] as const;

/** Tarif kartasi ostida: necha oy va "So'rov yuborish" — administratorga boradi. */
export function RequestPlan({ plan, price }: { plan: "standard" | "premium"; price: number }) {
  const { t } = useI18n();
  const b = t.billing;
  const router = useRouter();
  const [months, setMonths] = useState<(typeof MONTHS)[number]>(1);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function send() {
    setBusy(true);
    setError(null);
    const res = await api("/api/v1/billing/requests", { body: { plan, months } });
    setBusy(false);
    if (res.ok) router.refresh();
    else setError((t.errors as Record<string, string>)[res.error] ?? t.errors.SERVER_ERROR);
  }

  return (
    <div className="flex flex-col gap-2 border-t border-line pt-4">
      <div role="radiogroup" aria-label={b.requestTitle} className="grid grid-cols-3 gap-1 rounded-xl border border-line bg-surface-2/60 p-1">
        {MONTHS.map((n) => (
          <button
            key={n}
            type="button"
            role="radio"
            aria-checked={months === n}
            onClick={() => setMonths(n)}
            className={`cursor-pointer rounded-lg py-1.5 text-[13px] font-semibold ${months === n ? "bg-accent text-accent-fg" : "text-muted hover:text-text"}`}
          >
            {fmt(b.months, { n })}
          </button>
        ))}
      </div>
      <span className="text-[13px] text-muted">{fmt(b.total, { sum: formatAmount(price * months) })}</span>
      <Button type="button" onClick={send} loading={busy}>
        <Send size={15} aria-hidden />
        {b.request}
      </Button>
      {error && <p className="text-[13px] text-danger">{error}</p>}
    </div>
  );
}

/** Ochiq so'rovni bekor qilish. */
export function CancelPlanRequest({ id }: { id: string }) {
  const { t } = useI18n();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  return (
    <Button
      type="button"
      variant="ghost"
      loading={busy}
      onClick={async () => {
        setBusy(true);
        await api(`/api/v1/billing/requests/${id}`, { method: "DELETE" });
        setBusy(false);
        router.refresh();
      }}
    >
      {t.billing.cancel}
    </Button>
  );
}
