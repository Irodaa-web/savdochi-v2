"use client";

import clsx from "clsx";
import { Store, Truck } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { PasswordField, SelectField, TextField } from "@/components/ui/Field";
import { fmt, useI18n } from "@/i18n/client";
import { api } from "@/lib/apiClient";
import { REGION_CODES } from "@/lib/regions";
import { errorText, safeNext } from "../authHelpers";

type Role = "buyer" | "seller";

const RESEND_SECONDS = 60;

/** `sms` — SMS tasdiqlash yoqilganmi: yoqilgan bo'lsa forma ikki bosqichli (ma'lumotlar → kod). */
export function RegisterForm({ sms = false }: { sms?: boolean }) {
  const { t } = useI18n();
  const router = useRouter();
  const next = safeNext(useSearchParams().get("next"));
  const [role, setRole] = useState<Role>("buyer");
  const [form, setForm] = useState({ name: "", phone: "", region: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fields, setFields] = useState<Record<string, string>>({});
  const [step, setStep] = useState<"form" | "code">("form");
  const [code, setCode] = useState("");
  const [wait, setWait] = useState(0);
  useEffect(() => {
    if (wait <= 0) return;
    const timer = setTimeout(() => setWait((w) => w - 1), 1000);
    return () => clearTimeout(timer);
  }, [wait]);

  const set = (key: keyof typeof form) => (e: { target: { value: string } }) => setForm((f) => ({ ...f, [key]: e.target.value }));
  const fieldError = (key: string) => (fields[key] ? errorText(t, fields[key]) : undefined);

  async function requestCode() {
    setLoading(true);
    setError(null);
    setFields({});
    const res = await api("/api/v1/auth/code", { body: { phone: form.phone, purpose: "register" } });
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
    if (sms && step === "form") return requestCode();
    setLoading(true);
    setError(null);
    setFields({});
    const res = await api("/api/v1/auth/register", { body: { role, ...form, ...(sms ? { code } : {}) } });
    if (res.ok) {
      router.replace(next);
      router.refresh();
      return;
    }
    setLoading(false);
    if (res.fields) {
      setFields(res.fields);
      // Xato kodda emas, boshqa maydonda bo'lsa — birinchi bosqichga qaytamiz.
      if (Object.keys(res.fields).some((k) => k !== "code")) setStep("form");
    } else setError(errorText(t, res.error));
  }

  const roles: { value: Role; title: string; hint: string; Icon: typeof Store }[] = [
    { value: "buyer", title: t.auth.roleBuyer, hint: t.auth.roleBuyerHint, Icon: Store },
    { value: "seller", title: t.auth.roleSeller, hint: t.auth.roleSellerHint, Icon: Truck },
  ];

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-5">
      <div>
        <h1 className="text-[26px] font-bold tracking-tight">{t.auth.registerTitle}</h1>
        <p className="mt-1.5 text-muted">{t.auth.registerSubtitle}</p>
      </div>

      {error && <Alert>{error}</Alert>}

      {step === "code" && (
        <>
          <Alert tone="info">{fmt(t.auth.codeSent, { phone: form.phone })}</Alert>
          <TextField
            label={t.auth.code}
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            placeholder="000000"
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
            error={fieldError("code")}
            required
            autoFocus
          />
          <Button type="submit" size="lg" block loading={loading} disabled={code.length !== 6}>
            {t.auth.registerButton}
          </Button>
          <div className="flex flex-wrap justify-between gap-2 text-[14px]">
            <button type="button" className="cursor-pointer font-semibold text-accent hover:underline disabled:cursor-default disabled:text-muted disabled:no-underline" disabled={wait > 0 || loading} onClick={requestCode}>
              {wait > 0 ? fmt(t.auth.resendIn, { n: wait }) : t.auth.resend}
            </button>
            <button type="button" className="cursor-pointer text-muted hover:text-text" onClick={() => setStep("form")}>
              {t.auth.changePhone}
            </button>
          </div>
        </>
      )}

      <div className={clsx("flex flex-col gap-5", step === "code" && "hidden")}>
      <fieldset className="flex flex-col gap-1.5">
        <legend className="mb-1.5 text-[13px] font-medium">{t.auth.roleLabel}</legend>
        <div className="grid grid-cols-2 gap-3">
          {roles.map(({ value, title, hint, Icon }) => {
            const active = role === value;
            return (
              <label
                key={value}
                className={clsx(
                  "flex cursor-pointer flex-col gap-2 rounded-xl border p-3.5 transition-colors has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2",
                  active ? "border-accent bg-accent-soft" : "border-line bg-surface hover:border-muted/40",
                )}
              >
                <input type="radio" name="role" value={value} checked={active} onChange={() => setRole(value)} className="sr-only" />
                <span className={clsx("flex size-9 items-center justify-center rounded-lg", active ? "bg-accent text-accent-fg" : "bg-surface-2 text-muted")}>
                  <Icon size={18} aria-hidden />
                </span>
                <span className="font-semibold">{title}</span>
                <span className="text-[13px] leading-snug text-muted">{hint}</span>
              </label>
            );
          })}
        </div>
      </fieldset>

      <TextField
        label={t.auth.name}
        placeholder={t.auth.namePlaceholder}
        autoComplete="organization"
        value={form.name}
        onChange={set("name")}
        error={fieldError("name")}
        required
      />
      <TextField
        label={t.auth.phone}
        prefix="+998"
        type="tel"
        inputMode="tel"
        autoComplete="tel-national"
        placeholder="90 123 45 67"
        value={form.phone}
        onChange={set("phone")}
        error={fieldError("phone")}
        required
      />
      <SelectField
        label={t.auth.region}
        value={form.region}
        onChange={set("region")}
        placeholder={t.auth.region}
        options={REGION_CODES.map((code) => ({ value: code, label: t.regions[code] }))}
        error={fieldError("region")}
        required
      />
      <PasswordField
        label={t.auth.password}
        hint={t.auth.passwordHint}
        autoComplete="new-password"
        value={form.password}
        onChange={set("password")}
        error={fieldError("password")}
        showLabel={t.auth.showPassword}
        hideLabel={t.auth.hidePassword}
        required
      />

      <Button type="submit" size="lg" block loading={loading}>
        {sms ? t.auth.getCode : t.auth.registerButton}
      </Button>
      </div>

      <p className="text-center text-muted">
        {t.auth.haveAccount}{" "}
        <Link href={next === "/" ? "/login" : `/login?next=${encodeURIComponent(next)}`} className="font-semibold text-accent hover:underline">
          {t.auth.toLogin}
        </Link>
      </p>
    </form>
  );
}
