"use client";

import { CheckCircle2, RotateCcw, Send } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { useI18n } from "@/i18n/client";
import { api } from "@/lib/apiClient";
import type { TicketStatus } from "@/lib/tickets";

/** Administrator javobi: yozib yuborish (murojaat "jarayonda"), yuborib yopish yoki faqat holatni o'zgartirish. */
export function TicketReply({ id, status }: { id: string; status: TicketStatus }) {
  const { t } = useI18n();
  const router = useRouter();
  const [text, setText] = useState("");
  const [busy, setBusy] = useState<string | null>(null);

  async function send(next: TicketStatus, key: string) {
    setBusy(key);
    const res = await api(`/api/v1/admin/tickets/${id}`, { method: "PATCH", body: { status: next, reply: text } });
    setBusy(null);
    if (res.ok) {
      setText("");
      router.refresh();
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <textarea
        aria-label={t.tickets.replyPlaceholder}
        placeholder={t.tickets.replyPlaceholder}
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={2}
        maxLength={3000}
        className="rounded-xl border border-line bg-surface px-3 py-2 text-[14px] outline-none focus:border-accent"
      />
      <div className="flex flex-wrap gap-2">
        <Button type="button" onClick={() => send("in_progress", "send")} loading={busy === "send"} disabled={!text.trim()}>
          <Send size={15} aria-hidden />
          {t.tickets.send}
        </Button>
        {status !== "resolved" ? (
          <Button type="button" variant="secondary" onClick={() => send("resolved", "close")} loading={busy === "close"}>
            <CheckCircle2 size={15} aria-hidden />
            {text.trim() ? t.tickets.sendAndClose : t.tickets.close}
          </Button>
        ) : (
          <Button type="button" variant="ghost" onClick={() => send("open", "reopen")} loading={busy === "reopen"}>
            <RotateCcw size={15} aria-hidden />
            {t.tickets.reopen}
          </Button>
        )}
      </div>
    </div>
  );
}
