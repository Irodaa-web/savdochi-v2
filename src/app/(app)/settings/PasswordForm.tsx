"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { PasswordField } from "@/components/ui/Field";
import { useI18n } from "@/i18n/client";
import { api } from "@/lib/apiClient";

/** Parolni almashtirish. Muvaffaqiyatli bo'lsa — qayta kirish kerak (barcha sessiyalar yopiladi). */
export function PasswordForm() {
  const { t } = useI18n();
  const router = useRouter();
  const errors = t.errors as Record<string, string>;
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [fields, setFields] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setFields({});
    const res = await api("/api/v1/profile/password", { body: { current, next } });
    setBusy(false);
    if (res.ok) {
      router.replace("/login");
      router.refresh();
      return;
    }
    setFields(res.fields ?? { current: res.error });
  }

  return (
    <form onSubmit={submit} className="flex max-w-md flex-col gap-4">
      <PasswordField label={t.settings.current} showLabel={t.auth.showPassword} hideLabel={t.auth.hidePassword} value={current} onChange={(e) => setCurrent(e.target.value)} error={fields.current ? errors[fields.current] : undefined} autoComplete="current-password" />
      <PasswordField label={t.settings.next} hint={t.auth.passwordHint} showLabel={t.auth.showPassword} hideLabel={t.auth.hidePassword} value={next} onChange={(e) => setNext(e.target.value)} error={fields.next ? errors[fields.next] : undefined} autoComplete="new-password" />
      <Alert tone="info">{t.settings.logoutNote}</Alert>
      <Button type="submit" loading={busy} className="w-fit">
        {t.settings.change}
      </Button>
    </form>
  );
}
