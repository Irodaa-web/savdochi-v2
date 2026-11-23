"use client";

import { Eye, EyeOff } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { useI18n } from "@/i18n/client";
import { api } from "@/lib/apiClient";

/** Mahsulotni sabab bilan yashirish (oyna) yoki bir bosishda qaytarish. */
export function ModerateButton({ id, name, hidden }: { id: string; name: string; hidden: boolean }) {
  const { t } = useI18n();
  const m = t.moderation;
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  async function save(body: { hidden: boolean; note?: string }) {
    setBusy(true);
    const res = await api(`/api/v1/admin/products/${id}`, { method: "PATCH", body });
    setBusy(false);
    if (res.ok) {
      setOpen(false);
      setNote("");
      router.refresh();
    }
  }

  if (hidden)
    return (
      <Button type="button" variant="secondary" onClick={() => save({ hidden: false })} loading={busy}>
        <Eye size={15} aria-hidden />
        {m.show}
      </Button>
    );
  return (
    <>
      <Button type="button" variant="ghost" onClick={() => setOpen(true)}>
        <EyeOff size={15} aria-hidden />
        {m.hide}
      </Button>
      <Modal open={open} onClose={() => setOpen(false)} title={m.hideTitle}>
        <div className="flex flex-col gap-4">
          <p className="text-[14px]">
            <b>{name}</b>
          </p>
          <p className="text-[13px] text-muted">{m.hideHint}</p>
          <textarea
            rows={3}
            maxLength={500}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder={m.reasonPlaceholder}
            aria-label={m.reason}
            className="rounded-xl border border-line bg-surface px-3 py-2 text-[14px] outline-none focus:border-accent"
          />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              {t.common.cancel}
            </Button>
            <Button type="button" variant="danger" disabled={note.trim().length < 3} loading={busy} onClick={() => save({ hidden: true, note })}>
              {m.hideConfirm}
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
