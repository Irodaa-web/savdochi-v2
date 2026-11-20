"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { PasswordField } from "@/components/ui/Field";
import { useI18n } from "@/i18n/client";
import { api } from "@/lib/apiClient";
import { formatPhone } from "@/lib/phone";
import { errorText } from "../authHelpers";

/** Telegram havolasidan kelganda: yangi parol → saqlanadi va darhol kiriladi. */
export function NewPasswordForm({ phone, resetKey }: { phone: string; resetKey: string }) {
  const { t } = useI18n();
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldError, setFieldError] = useState<string | undefined>();

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setFieldError(undefined);
    const res = await api("/api/v1/auth/telegram-reset", { body: { phone, key: resetKey, password } });
    if (res.ok) {
      window.location.href = "/";
      return;
    }
    setLoading(false);
    if (res.fields?.password) setFieldError(errorText(t, res.fields.password));
    else setError(res.error === "CODE_INVALID" || res.fields ? t.auth.resetLinkInvalid : errorText(t, res.error));
  }

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-5">
      <div>
        <h1 className="text-[26px] font-bold tracking-tight">{t.auth.newPasswordTitle}</h1>
        <p className="mt-1.5 text-muted">{t.auth.newPasswordLead}</p>
      </div>
      {phone && <p className="rounded-xl border border-line bg-surface-2/60 px-3.5 py-2.5 font-medium tabular-nums">{formatPhone(phone)}</p>}
      {error && (
        <Alert>
          {error}{" "}
          <Link href="/forgot" className="font-semibold underline">
            {t.auth.tgResetTitle}
          </Link>
        </Alert>
      )}
      <PasswordField
        label={t.auth.newPassword}
        hint={t.auth.passwordHint}
        autoComplete="new-password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        error={fieldError}
        showLabel={t.auth.showPassword}
        hideLabel={t.auth.hidePassword}
        required
        autoFocus
      />
      <Button type="submit" size="lg" block loading={loading} disabled={!phone || !resetKey}>
        {t.auth.newPasswordSave}
      </Button>
      <Link href="/login" className="w-fit text-[14px] font-semibold text-accent hover:underline">
        {t.auth.backToLogin}
      </Link>
    </form>
  );
}
