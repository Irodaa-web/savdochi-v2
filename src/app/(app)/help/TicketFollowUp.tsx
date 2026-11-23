"use client";

import { Send } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { useI18n } from "@/i18n/client";
import { api } from "@/lib/apiClient";

/** Foydalanuvchi o'z murojaatiga qo'shimcha yozadi — murojaat yana ochiladi, administratorga xabar boradi. */
export function TicketFollowUp({ id }: { id: string }) {
  const { t } = useI18n();
  const router = useRouter();
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);

  async function send() {
    setBusy(true);
    const res = await api(`/api/v1/tickets/${id}`, { body: { text } });
    setBusy(false);
    if (res.ok) {
      setText("");
      router.refresh();
    }
  }

  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
      <textarea
        rows={1}
        maxLength={3000}
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={t.tickets.followUp}
        aria-label={t.tickets.followUp}
        className="min-h-10 flex-1 rounded-xl border border-line bg-surface px-3 py-2 text-[14px] outline-none focus:border-accent"
      />
      <Button type="button" onClick={send} loading={busy} disabled={!text.trim()}>
        <Send size={15} aria-hidden />
        {t.tickets.send}
      </Button>
    </div>
  );
}
