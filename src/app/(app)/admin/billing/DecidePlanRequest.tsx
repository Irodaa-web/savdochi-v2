"use client";

import { Check, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { useI18n } from "@/i18n/client";
import { fmt } from "@/i18n/format";
import { api } from "@/lib/apiClient";

/** So'rovni tasdiqlash (to'langan summa bilan) yoki sabab bilan rad etish. */
export function DecidePlanRequest({ id, plan, months, amount }: { id: string; plan: "standard" | "premium"; months: number; amount: number }) {
  const { t } = useI18n();
  const b = t.billing;
  const router = useRouter();
  const [mode, setMode] = useState<"approve" | "reject" | null>(null);
  const [paid, setPaid] = useState(String(amount));
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save(body: object) {
    setBusy(true);
    setError(null);
    const res = await api(`/api/v1/admin/billing/${id}`, { method: "PATCH", body });
    setBusy(false);
    if (res.ok) {
      setMode(null);
      router.refresh();
    } else setError((t.errors as Record<string, string>)[res.error] ?? t.errors.SERVER_ERROR);
  }

  const input = "h-10 rounded-xl border border-line bg-surface px-3 text-[14px] outline-none focus:border-accent";
  return (
    <>
      <div className="flex flex-wrap gap-2">
        <Button type="button" onClick={() => setMode("approve")}>
          <Check size={15} aria-hidden />
          {b.approve}
        </Button>
        <Button type="button" variant="ghost" onClick={() => setMode("reject")}>
          <X size={15} aria-hidden />
          {b.reject}
        </Button>
      </div>
      <Modal open={mode !== null} onClose={() => setMode(null)} title={mode === "approve" ? b.approveTitle : b.rejectTitle}>
        <div className="flex flex-col gap-4">
          {mode === "approve" ? (
            <>
              <p className="text-[13px] text-muted">{fmt(b.approveHint, { plan: t.plans.names[plan], months })}</p>
              <label className="flex flex-col gap-1.5 text-[13px] font-medium">
                {b.paidAmount}
                <input inputMode="numeric" value={paid} onChange={(e) => setPaid(e.target.value.replace(/\D/g, ""))} className={input} />
              </label>
            </>
          ) : (
            <textarea rows={3} maxLength={500} value={reason} onChange={(e) => setReason(e.target.value)} placeholder={b.rejectReason} aria-label={b.rejectReason} className="rounded-xl border border-line bg-surface px-3 py-2 text-[14px] outline-none focus:border-accent" />
          )}
          {error && <p className="text-[13px] text-danger">{error}</p>}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setMode(null)}>
              {t.common.cancel}
            </Button>
            {mode === "approve" ? (
              <Button type="button" loading={busy} disabled={paid === ""} onClick={() => save({ action: "approve", paidAmount: Number(paid) })}>
                {b.approve}
              </Button>
            ) : (
              <Button type="button" variant="danger" loading={busy} disabled={reason.trim().length < 3} onClick={() => save({ action: "reject", reason })}>
                {b.reject}
              </Button>
            )}
          </div>
        </div>
      </Modal>
    </>
  );
}
