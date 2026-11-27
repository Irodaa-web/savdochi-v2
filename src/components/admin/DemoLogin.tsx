"use client";

import { Building2, Store } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { useI18n } from "@/i18n/client";
import { api } from "@/lib/apiClient";

/** Admin bosh panelidagi "Sinov hisoblari": demo do'kon yoki demo kompaniya sifatida bir bosishda kirish. */
export function DemoLogin() {
  const { t } = useI18n();
  const a = t.adminPanel;
  const [busy, setBusy] = useState<"buyer" | "seller" | null>(null);
  const [error, setError] = useState(false);

  async function enter(role: "buyer" | "seller") {
    setBusy(role);
    setError(false);
    const res = await api("/api/v1/admin/demo-login", { method: "POST", body: { role } });
    if (!res.ok) {
      setBusy(null);
      setError(true);
      return;
    }
    // To'liq qayta yuklash: menyu, belgilar va kesh yangi (demo) hisob bilan boshidan chiziladi.
    window.location.assign("/");
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="text-muted">{a.demoText}</p>
      <div className="flex flex-col gap-2 sm:flex-row">
        <Button variant="secondary" loading={busy === "buyer"} disabled={busy !== null} onClick={() => enter("buyer")}>
          <Store size={17} aria-hidden />
          {a.demoAsBuyer}
        </Button>
        <Button variant="secondary" loading={busy === "seller"} disabled={busy !== null} onClick={() => enter("seller")}>
          <Building2 size={17} aria-hidden />
          {a.demoAsSeller}
        </Button>
      </div>
      <p className="text-[13px] text-muted">{a.demoHint}</p>
      {error && (
        <p role="alert" className="text-[13px] text-danger">
          {t.errors.SERVER_ERROR}
        </p>
      )}
    </div>
  );
}
