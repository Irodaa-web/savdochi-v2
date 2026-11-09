"use client";

import { Send } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Pill } from "@/components/ui/Card";
import { useI18n } from "@/i18n/client";
import { api } from "@/lib/apiClient";

/** Telegram bildirishnomalarini ulash/uzish. Bot sozlanmagan bo'lsa ko'rsatilmaydi. */
export function TelegramCard({ linked }: { linked: boolean }) {
  const { t } = useI18n();
  const router = useRouter();
  const [url, setUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function connect() {
    setBusy(true);
    const res = await api<{ url: string }>("/api/v1/telegram/link", { method: "POST" });
    setBusy(false);
    if (res.ok) {
      setUrl(res.data.url);
      window.open(res.data.url, "_blank", "noopener");
    }
  }

  async function disconnect() {
    setBusy(true);
    await api("/api/v1/telegram/link", { method: "DELETE" });
    setBusy(false);
    setUrl(null);
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 font-semibold">
          <Send size={18} aria-hidden />
          {t.telegram.title}
        </h2>
        {linked && <Pill tone="success">{t.telegram.connected}</Pill>}
      </div>
      <p className="text-[14px] text-muted">{t.telegram.lead}</p>
      {linked ? (
        <Button type="button" variant="secondary" onClick={disconnect} loading={busy} className="w-fit">
          {t.telegram.disconnect}
        </Button>
      ) : url ? (
        <div className="flex flex-col gap-2">
          <p className="text-[13px] text-muted">{t.telegram.connectHint}</p>
          <div className="flex flex-wrap gap-2">
            <a href={url} target="_blank" rel="noopener noreferrer" className="inline-flex h-10 items-center rounded-lg bg-accent px-4 font-semibold text-accent-fg hover:opacity-90">
              {t.telegram.openBot}
            </a>
            <Button type="button" variant="secondary" onClick={() => router.refresh()}>
              {t.telegram.check}
            </Button>
          </div>
        </div>
      ) : (
        <Button type="button" onClick={connect} loading={busy} className="w-fit">
          {t.telegram.connect}
        </Button>
      )}
    </div>
  );
}
