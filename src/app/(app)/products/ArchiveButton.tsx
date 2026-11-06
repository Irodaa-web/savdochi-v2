"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { fmt, useI18n } from "@/i18n/client";
import { api } from "@/lib/apiClient";

export function ArchiveButton({ id, name }: { id: string; name: string }) {
  const { t } = useI18n();
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function archive() {
    if (!window.confirm(fmt(t.products.archiveConfirm, { name }))) return;
    setBusy(true);
    const res = await api(`/api/v1/products/${id}`, { method: "DELETE" });
    setBusy(false);
    if (res.ok) router.refresh();
  }

  return (
    <button
      type="button"
      onClick={archive}
      disabled={busy}
      className="cursor-pointer rounded-md px-2.5 py-1.5 text-[13px] font-medium text-danger hover:bg-danger-soft disabled:opacity-60"
    >
      {t.products.archive}
    </button>
  );
}
