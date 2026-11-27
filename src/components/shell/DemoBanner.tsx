"use client";

import { FlaskConical, Undo2 } from "lucide-react";
import { useState } from "react";
import { useI18n } from "@/i18n/client";
import { fmt } from "@/i18n/format";
import { api } from "@/lib/apiClient";

/** Sinov (demo) hisobida — har sahifa tepasida eslatma va administrator hisobiga qaytish tugmasi. */
export function DemoBanner({ name }: { name: string }) {
  const { t } = useI18n();
  const d = t.demoMode;
  const [busy, setBusy] = useState(false);

  async function back() {
    setBusy(true);
    const res = await api("/api/v1/auth/demo-return", { method: "POST" });
    // Admin sessiyasi saqlanmagan bo'lsa — hisobdan chiqildi, kirish sahifasiga.
    window.location.assign(res.ok ? "/admin" : "/login");
  }

  return (
    <div role="status" className="flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-amber-300/50 bg-amber-50 px-4 py-2 text-[13px] text-amber-900 sm:px-6 dark:border-amber-400/20 dark:bg-amber-400/10 dark:text-amber-200">
      <FlaskConical size={16} className="shrink-0" aria-hidden />
      <span className="min-w-0 flex-1">
        <b className="font-semibold">{fmt(d.banner, { name })}</b> <span className="hidden sm:inline">{d.note}</span>
      </span>
      <button
        type="button"
        onClick={back}
        disabled={busy}
        className="inline-flex h-8 shrink-0 cursor-pointer items-center gap-1.5 rounded-lg bg-amber-900/90 px-3 font-semibold text-amber-50 hover:bg-amber-900 disabled:opacity-60 dark:bg-amber-300 dark:text-amber-950"
      >
        <Undo2 size={14} aria-hidden />
        {d.back}
      </button>
    </div>
  );
}
