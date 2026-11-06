"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { PasswordField, TextField } from "@/components/ui/Field";
import { useI18n } from "@/i18n/client";
import { api } from "@/lib/apiClient";
import { errorText, safeNext } from "../authHelpers";

export function LoginForm({ demo = false }: { demo?: boolean }) {
  const { t } = useI18n();
  const router = useRouter();
  const next = safeNext(useSearchParams().get("next"));
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fields, setFields] = useState<Record<string, string>>({});

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setFields({});
    const res = await api("/api/v1/auth/login", { body: { phone, password } });
    if (res.ok) {
      router.replace(next);
      router.refresh();
      return;
    }
    setLoading(false);
    if (res.fields) setFields(res.fields);
    else setError(errorText(t, res.error));
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

      <TextField
        label={t.auth.phone}
        prefix="+998"
        type="tel"
        inputMode="tel"
        autoComplete="tel-national"
        placeholder="90 123 45 67"
        value={phone}
        onChange={(e) => setPhone(e.target.value)}
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

      <Button type="submit" size="lg" block loading={loading}>
        {t.auth.loginButton}
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
