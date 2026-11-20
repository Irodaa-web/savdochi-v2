"use client";

import { LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useI18n } from "@/i18n/client";
import { api } from "@/lib/apiClient";

/** Hisobdan chiqish (sozlamalar sahifasi; compact — sidebar pastidagi belgi). Profil menyusidagi bilan bir xil ish. */
export function LogoutButton({ compact = false }: { compact?: boolean }) {
  const { t } = useI18n();
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function logout() {
    setBusy(true);
    await api("/api/v1/auth/logout", { method: "POST" });
    router.replace("/login");
    router.refresh();
  }

  if (compact)
    return (
      <button
        type="button"
        onClick={logout}
        disabled={busy}
        aria-label={t.settings.logout}
        title={t.settings.logout}
        className="flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-xl text-danger transition-colors hover:bg-danger-soft disabled:opacity-60"
      >
        <LogOut size={17} aria-hidden />
      </button>
    );

  return (
    <button
      type="button"
      onClick={logout}
      disabled={busy}
      className="inline-flex h-10 w-fit cursor-pointer items-center gap-2 rounded-xl px-3 font-semibold text-danger ring-1 ring-danger/25 transition-colors ring-inset hover:bg-danger-soft disabled:opacity-60"
    >
      <LogOut size={16} aria-hidden />
      {t.settings.logout}
    </button>
  );
}
