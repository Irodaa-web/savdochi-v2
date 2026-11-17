"use client";

import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { PasswordField, TextField } from "@/components/ui/Field";
import { fmt, useI18n } from "@/i18n/client";
import { api } from "@/lib/apiClient";
import { errorText } from "../authHelpers";

const RESEND_SECONDS = 60;

/** 1) telefon → SMS kod; 2) kod + yangi parol; 3) tayyor. */
export function ForgotForm() {
  const { t } = useI18n();
  const [step, setStep] = useState<"phone" | "code" | "done">("phone");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fields, setFields] = useState<Record<string, string>>({});
  const [wait, setWait] = useState(0);
  useEffect(() => {
    if (wait <= 0) return;
    const timer = setTimeout(() => setWait((w) => w - 1), 1000);
    return () => clearTimeout(timer);
  }, [wait]);
  const fe = (k: string) => (fields[k] ? errorText(t, fields[k]) : undefined);

  async function requestCode() {
    setLoading(true);
    setError(null);
    setFields({});
    const res = await api("/api/v1/auth/code", { body: { phone, purpose: "reset" } });
    setLoading(false);
    if (res.ok) {
      setStep("code");
      setCode("");
      setWait(RESEND_SECONDS);
      return;
    }
    if (res.fields) setFields(res.fields);
    else setError(errorText(t, res.error));
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (step === "phone") return requestCode();
    setLoading(true);
    setError(null);
    setFields({});
    const res = await api("/api/v1/auth/password-reset", { body: { phone, code, password } });
    setLoading(false);
    if (res.ok) return setStep("done");
    if (res.fields) setFields(res.fields);
    else setError(errorText(t, res.error));
  }

  const back = (
    <p className="text-center text-muted">
      <Link href="/login" className="font-semibold text-accent hover:underline">
        {t.auth.backToLogin}
      </Link>
    </p>
  );

  if (step === "done")
    return (
      <div className="flex flex-col gap-5">
        <h1 className="text-[26px] font-bold tracking-tight">{t.auth.forgotTitle}</h1>
        <Alert tone="success">{t.auth.resetDone}</Alert>
        {back}
      </div>
    );

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-5">
      <div>
        <h1 className="text-[26px] font-bold tracking-tight">{t.auth.forgotTitle}</h1>
        <p className="mt-1.5 text-muted">{t.auth.forgotSubtitle}</p>
      </div>
      {error && <Alert>{error}</Alert>}

      {step === "phone" ? (
        <>
          <TextField label={t.auth.phone} prefix="+998" type="tel" inputMode="tel" autoComplete="tel-national" placeholder="90 123 45 67" value={phone} onChange={(e) => setPhone(e.target.value)} error={fe("phone")} required autoFocus />
          <Button type="submit" size="lg" block loading={loading}>
            {t.auth.getCode}
          </Button>
        </>
      ) : (
        <>
          <Alert tone="info">{t.auth.forgotSent}</Alert>
          <TextField label={t.auth.code} inputMode="numeric" autoComplete="one-time-code" maxLength={6} placeholder="000000" value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))} error={fe("code")} required autoFocus />
          <PasswordField label={t.auth.newPassword} hint={t.auth.passwordHint} autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} error={fe("password")} showLabel={t.auth.showPassword} hideLabel={t.auth.hidePassword} required />
          <Button type="submit" size="lg" block loading={loading} disabled={code.length !== 6}>
            {t.auth.resetButton}
          </Button>
          <button type="button" className="w-fit cursor-pointer text-[14px] font-semibold text-accent hover:underline disabled:cursor-default disabled:text-muted disabled:no-underline" disabled={wait > 0 || loading} onClick={requestCode}>
            {wait > 0 ? fmt(t.auth.resendIn, { n: wait }) : t.auth.resend}
          </button>
        </>
      )}
      {back}
    </form>
  );
}
