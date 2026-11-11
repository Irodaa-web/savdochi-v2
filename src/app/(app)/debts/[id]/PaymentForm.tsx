"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/Field";
import { useI18n } from "@/i18n/client";
import { api } from "@/lib/apiClient";

/** Kompaniya: hamkordan olingan to'lovni qayd etish (eng eski buyurtmalardan boshlab taqsimlanadi). */
export function PaymentForm({ partnerId, outstanding }: { partnerId: string; outstanding: number }) {
  const { t } = useI18n();
  const router = useRouter();
  const errors = t.errors as Record<string, string>;
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldError, setFieldError] = useState<string | undefined>();
  const [done, setDone] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setFieldError(undefined);
    setDone(false);
    const res = await api(`/api/v1/debts/${partnerId}/payments`, { body: { amount: Number(amount) || 0, note } });
    setBusy(false);
    if (res.ok) {
      setAmount("");
      setNote("");
      setDone(true);
      router.refresh();
      return;
    }
    if (res.fields?.amount) setFieldError(errors[res.fields.amount] ?? errors.numberInvalid);
    else setError(errors[res.error] ?? errors.SERVER_ERROR!);
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-3" noValidate>
      <h2 className="font-semibold">{t.debts.record}</h2>
      {error && <Alert>{error}</Alert>}
      {done && <Alert tone="success">{t.debts.recorded}</Alert>}
      <TextField
        label={t.debts.amount}
        type="number"
        inputMode="numeric"
        min={1}
        max={outstanding}
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        error={fieldError}
        required
      />
      <TextField label={t.debts.note} value={note} maxLength={300} onChange={(e) => setNote(e.target.value)} placeholder={t.debts.notePlaceholder} />
      <div className="flex flex-wrap gap-2">
        <Button type="submit" loading={busy} disabled={!amount}>
          {t.debts.record}
        </Button>
        <Button type="button" variant="ghost" onClick={() => setAmount(String(outstanding))}>
          {t.debts.fillAll}
        </Button>
      </div>
    </form>
  );
}
