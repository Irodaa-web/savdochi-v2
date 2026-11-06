"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/Field";
import { useI18n } from "@/i18n/client";
import { api } from "@/lib/apiClient";

export function TicketForm() {
  const { t } = useI18n();
  const router = useRouter();
  const errors = t.errors as Record<string, string>;
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [fields, setFields] = useState<Record<string, string>>({});
  const [state, setState] = useState<"idle" | "busy" | "sent" | "error">("idle");

  async function submit(e: FormEvent) {
    e.preventDefault();
    setState("busy");
    setFields({});
    const res = await api("/api/v1/tickets", { body: { subject, message } });
    if (!res.ok) {
      setFields(res.fields ?? {});
      return setState("error");
    }
    setSubject("");
    setMessage("");
    setState("sent");
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4" noValidate>
      <TextField label={t.help.subject} value={subject} onChange={(e) => setSubject(e.target.value)} maxLength={160} error={fields.subject ? errors[fields.subject] : undefined} />
      <div className="flex flex-col gap-1.5">
        <label htmlFor="ticket-message" className="text-[13px] font-medium">
          {t.help.message}
        </label>
        <textarea id="ticket-message" value={message} onChange={(e) => setMessage(e.target.value)} rows={5} maxLength={3000} className="rounded-lg border border-line bg-surface p-3 outline-none focus:border-accent" />
        {fields.message && <p className="text-[13px] text-danger">{errors[fields.message]}</p>}
      </div>
      {state === "sent" && <Alert tone="success">{t.help.sent}</Alert>}
      {state === "error" && !Object.keys(fields).length && <Alert>{errors.SERVER_ERROR}</Alert>}
      <Button type="submit" loading={state === "busy"} className="w-fit">
        {t.help.send}
      </Button>
    </form>
  );
}
