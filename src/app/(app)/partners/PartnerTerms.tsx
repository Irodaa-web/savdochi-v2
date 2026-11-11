"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/Field";
import { useI18n } from "@/i18n/client";
import { api } from "@/lib/apiClient";

/** Kompaniya: hamkor do'kon uchun chegirma va shartlar. */
export function PartnerTerms({ id, discount, terms, creditLimit, paymentDays }: { id: string; discount: number; terms: string; creditLimit: number; paymentDays: number }) {
  const { t } = useI18n();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ discount: String(discount), terms, creditLimit: String(creditLimit || 0), paymentDays: String(paymentDays || 14) });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);

  async function save() {
    setBusy(true);
    setError(false);
    const res = await api(`/api/v1/partnerships/${id}`, { method: "PATCH", body: { action: "update", discount: Number(form.discount) || 0, terms: form.terms, creditLimit: Number(form.creditLimit) || 0, paymentDays: Number(form.paymentDays) || 14 } });
    setBusy(false);
    if (!res.ok) return setError(true);
    setOpen(false);
    router.refresh();
  }

  if (!open)
    return (
      <Button type="button" variant="ghost" onClick={() => setOpen(true)} className="w-fit px-2">
        {t.partners.editTerms}
      </Button>
    );

  return (
    <div className="grid gap-3 rounded-lg bg-surface-2 p-3 sm:grid-cols-[140px_1fr]">
      <TextField label={t.partners.discount} type="number" min={0} max={50} value={form.discount} onChange={(e) => setForm({ ...form, discount: e.target.value })} error={error ? t.errors.numberInvalid : undefined} />
      <TextField label={t.partners.terms} value={form.terms} maxLength={1000} onChange={(e) => setForm({ ...form, terms: e.target.value })} placeholder={t.partners.termsPlaceholder} />
      <TextField label={t.partners.creditLimit} hint={t.partners.creditLimitHint} type="number" inputMode="numeric" min={0} step={100000} value={form.creditLimit} onChange={(e) => setForm({ ...form, creditLimit: e.target.value })} />
      <TextField label={t.partners.paymentDays} type="number" inputMode="numeric" min={1} max={180} value={form.paymentDays} onChange={(e) => setForm({ ...form, paymentDays: e.target.value })} />
      <div className="flex gap-2 sm:col-span-2">
        <Button type="button" onClick={save} loading={busy}>
          {t.products.save}
        </Button>
        <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
          {t.products.cancel}
        </Button>
      </div>
    </div>
  );
}
