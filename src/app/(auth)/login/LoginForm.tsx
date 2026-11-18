"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { PasswordField, TextField } from "@/components/ui/Field";
import { fmt, useI18n } from "@/i18n/client";
import { api } from "@/lib/apiClient";
import { errorText, safeNext } from "../authHelpers";

export function LoginForm({ demo = false, sms = false }: { demo?: boolean; sms?: boolean }) {
  const { t } = useI18n();
  const router = useRouter();
  const params = useSearchParams();
  const next = safeNext(params.get("next"));
  // Sessiya nofaollik tufayli tugagan bo'lsa (/api/v1/auth/reset → ?reason=inactive).
  const pausedNotice = params.get("reason") === "inactive";
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  // Nofaol hisob: parol to'g'ri, SMS kod bilan qayta tasdiqlash bosqichi.
  const [inactive, setInactive] = useState(false);
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fields, setFields] = useState<Record<string, string>>({});

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setFields({});
    const res = await api("/api/v1/auth/login", { body: { phone, password, ...(inactive && code ? { code } : {}) } });
    if (res.ok) {
      router.replace(next);
      router.refresh();
      return;
    }
    setLoading(false);
    if (res.error === "ACCOUNT_INACTIVE") {
      // Kod yuborildi — kod kiritish bosqichi.
      setInactive(true);
      setCode("");
      return;
    }
    if (res.fields) setFields(res.fields);
    else setError(errorText(t, res.error));
  }

  /** Kodni qayta yuborish: kodsiz so'rov server tomonda yangi kod yuboradi. */
  async function resendCode() {
    setLoading(true);
    setError(null);
    setFields({});
    const res = await api("/api/v1/auth/login", { body: { phone, password } });
    setLoading(false);
    if (!res.ok && res.error !== "ACCOUNT_INACTIVE") setError(errorText(t, res.error));
  }

  async function demoLogin(role: "buyer" | "seller") {
    setLoading(true);
    setError(null);
    const res = await api("/api/v1/auth/demo", { body: { role } });
    if (res.ok) {
      router.replace("/");
      router.refresh();
      return;
    }
    setLoading(false);
    setError(errorText(t, res.error));
  }

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-5">
      <div>
        <h1 className="text-[26px] font-bold tracking-tight">{t.auth.loginTitle}</h1>
        <p className="mt-1.5 text-muted">{t.auth.loginSubtitle}</p>
      </div>

      {error && <Alert>{error}</Alert>}
      {pausedNotice && !inactive && <Alert tone="info">{t.auth.inactiveNotice}</Alert>}
      {inactive && <Alert tone="info">{fmt(t.auth.inactiveVerify, { phone })}</Alert>}

      <TextField
        label={t.auth.phone}
        prefix="+998"
        type="tel"
        inputMode="tel"
        autoComplete="tel-national"
        placeholder="90 123 45 67"
        value={phone}
        onChange={(e) => {
          setPhone(e.target.value);
          setInactive(false);
        }}
        error={fields.phone ? errorText(t, fields.phone) : undefined}
        required
        autoFocus
      />
      <PasswordField
        label={t.auth.password}
        autoComplete="current-password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        error={fields.password ? errorText(t, fields.password) : undefined}
        showLabel={t.auth.showPassword}
        hideLabel={t.auth.hidePassword}
        required
      />

      {inactive && (
        <TextField
          label={t.auth.code}
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={6}
          placeholder="123456"
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
          error={fields.code ? errorText(t, fields.code) : undefined}
          required
          autoFocus
        />
      )}
      {inactive && (
        <button type="button" onClick={resendCode} disabled={loading} className="-mt-2 w-fit cursor-pointer text-[14px] font-semibold text-accent hover:underline disabled:opacity-60">
          {t.auth.inactiveResend}
        </button>
      )}

      {sms && !inactive && (
        <Link href="/forgot" className="-mt-2 w-fit text-[14px] font-semibold text-accent hover:underline">
          {t.auth.forgot}
        </Link>
      )}

      <Button type="submit" size="lg" block loading={loading}>
        {inactive ? t.auth.inactiveSubmit : t.auth.loginButton}
      </Button>

      {demo && (
        <div className="flex flex-col gap-2 rounded-xl border border-dashed border-line p-4">
          <p className="text-[13px] text-muted">{t.auth.demoHint}</p>
          <div className="grid grid-cols-2 gap-2">
            <Button type="button" variant="secondary" disabled={loading} onClick={() => demoLogin("buyer")}>
              {t.auth.demoBuyer}
            </Button>
            <Button type="button" variant="secondary" disabled={loading} onClick={() => demoLogin("seller")}>
              {t.auth.demoSeller}
            </Button>
          </div>
        </div>
      )}

      <p className="text-center text-muted">
        {t.auth.noAccount}{" "}
        <Link href={next === "/" ? "/register" : `/register?next=${encodeURIComponent(next)}`} className="font-semibold text-accent hover:underline">
          {t.auth.toRegister}
        </Link>
      </p>
    </form>
  );
}
