"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { SelectField } from "@/components/ui/Field";
import { useI18n } from "@/i18n/client";
import { api } from "@/lib/apiClient";
import { TICKET_STATUSES, type TicketStatus } from "@/lib/tickets";

export function TicketReply({ id, status, reply }: { id: string; status: TicketStatus; reply: string }) {
  const { t } = useI18n();
  const router = useRouter();
  const [form, setForm] = useState({ status, reply });
  const [busy, setBusy] = useState(false);

  async function save() {
    setBusy(true);
    await api(`/api/v1/admin/tickets/${id}`, { method: "PATCH", body: form });
    setBusy(false);
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-2">
      <textarea aria-label={t.help.reply} value={form.reply} onChange={(e) => setForm({ ...form, reply: e.target.value })} rows={3} maxLength={3000} className="rounded-lg border border-line bg-surface p-2.5 outline-none focus:border-accent" />
      <div className="flex flex-wrap items-end gap-2">
        <div className="w-48">
          <SelectField label={t.admin.status} value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as TicketStatus })} options={TICKET_STATUSES.map((s) => ({ value: s, label: t.ticketStatus[s] }))} />
        </div>
        <Button type="button" onClick={save} loading={busy}>
          {t.products.save}
        </Button>
      </div>
    </div>
  );
}
