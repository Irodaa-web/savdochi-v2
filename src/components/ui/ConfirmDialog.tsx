"use client";

import { useI18n } from "@/i18n/client";
import { Button } from "./Button";
import { Modal } from "./Modal";

/** Ha / Yo'q tasdiqlash oynasi. Brauzerning confirm() oynasi o'rniga ishlatiladi. */
export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel,
  danger = false,
  busy = false,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title?: string;
  message: string;
  confirmLabel?: string;
  danger?: boolean;
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const { t } = useI18n();
  return (
    <Modal open={open} onClose={onCancel} title={title ?? t.common.confirm}>
      <p className="text-[14px] leading-relaxed text-muted">{message}</p>
      <div className="mt-5 flex flex-wrap justify-end gap-2">
        <Button type="button" variant="secondary" onClick={onCancel} disabled={busy}>
          {t.common.cancel}
        </Button>
        <Button type="button" variant={danger ? "danger" : "primary"} onClick={onConfirm} loading={busy}>
          {confirmLabel ?? t.common.confirm}
        </Button>
      </div>
    </Modal>
  );
}
