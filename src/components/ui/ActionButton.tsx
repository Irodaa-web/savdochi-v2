"use client";

import { useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";
import { useI18n } from "@/i18n/client";
import { api } from "@/lib/apiClient";
import { Button, type ButtonProps } from "./Button";
import { ConfirmDialog } from "./ConfirmDialog";

/**
 * Bitta API amalini bajaradigan tugma: so'rov → sahifani yangilash.
 * confirm berilsa, avval tasdiqlash oynasi chiqadi. Xato bo'lsa tugma yonida tarjima qilingan matn chiqadi.
 */
export function ActionButton({
  path,
  method = "POST",
  body,
  confirm,
  onDone,
  children,
  ...rest
}: Omit<ButtonProps, "onClick" | "children"> & {
  path: string;
  method?: string;
  body?: unknown;
  confirm?: string;
  onDone?: (data: unknown) => void;
  children: ReactNode;
}) {
  const { t } = useI18n();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [asking, setAsking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function execute() {
    setBusy(true);
    setError(null);
    const res = await api(path, { method, body: body ?? {} });
    setBusy(false);
    if (!res.ok) {
      const errors = t.errors as Record<string, string>;
      setError(errors[res.error] ?? errors.SERVER_ERROR!);
      return;
    }
    onDone?.(res.data);
    router.refresh();
  }

  return (
    <span className="inline-flex flex-col gap-1">
      <Button type="button" onClick={() => (confirm ? setAsking(true) : execute())} loading={busy} {...rest}>
        {children}
      </Button>
      {confirm && (
        <ConfirmDialog
          open={asking}
          message={confirm}
          onCancel={() => setAsking(false)}
          onConfirm={() => {
            setAsking(false);
            void execute();
          }}
        />
      )}
      {error && (
        <span role="alert" className="text-[12px] text-danger">
          {error}
        </span>
      )}
    </span>
  );
}
