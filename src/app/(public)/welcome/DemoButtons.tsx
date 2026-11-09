"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { useI18n } from "@/i18n/client";
import { api } from "@/lib/apiClient";

/** Demo hisobga bir bosishda kirish (DEMO_MODE=1 bo'lganda ko'rsatiladi). */
export function DemoButtons() {
  const { t } = useI18n();
  const router = useRouter();
  const [busy, setBusy] = useState<"buyer" | "seller" | null>(null);

  async function enter(role: "buyer" | "seller") {
    setBusy(role);
    const res = await api("/api/v1/auth/demo", { body: { role } });
    if (res.ok) {
      router.push("/");
      router.refresh();
      return;
    }
    setBusy(null);
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-[13px] text-header-muted">{t.landing.demo}</span>
      <Button type="button" variant="secondary" loading={busy === "buyer"} disabled={busy !== null} onClick={() => enter("buyer")}>
        {t.auth.demoBuyer}
      </Button>
      <Button type="button" variant="secondary" loading={busy === "seller"} disabled={busy !== null} onClick={() => enter("seller")}>
        {t.auth.demoSeller}
      </Button>
    </div>
  );
}
