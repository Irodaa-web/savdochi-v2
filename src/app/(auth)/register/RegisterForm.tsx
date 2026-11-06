"use client";

import clsx from "clsx";
import { Store, Truck } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { PasswordField, SelectField, TextField } from "@/components/ui/Field";
import { useI18n } from "@/i18n/client";
import { api } from "@/lib/apiClient";
import { REGION_CODES } from "@/lib/regions";
import { errorText, safeNext } from "../authHelpers";

type Role = "buyer" | "seller";

export function RegisterForm() {
  const { t } = useI18n();
  const router = useRouter();
  const next = safeNext(useSearchParams().get("next"));
  const [role, setRole] = useState<Role>("buyer");
  const [form, setForm] = useState({ name: "", phone: "", region: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fields, setFields] = useState<Record<string, string>>({});

  const set = (key: keyof typeof form) => (e: { target: { value: string } }) => setForm((f) => ({ ...f, [key]: e.target.value }));
  const fieldError = (key: string) => (fields[key] ? errorText(t, fields[key]) : undefined);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setFields({});
    const res = await api("/api/v1/auth/register", { body: { role, ...form } });
    if (res.ok) {
      router.replace(next);
      router.refresh();
      return;
    }
    setLoading(false);
    if (res.fields) setFields(res.fields);
    else setError(errorText(t, res.error));
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
        {t.auth.registerButton}
      </Button>

      <p className="text-center text-muted">
        {t.auth.haveAccount}{" "}
        <Link href={next === "/" ? "/login" : `/login?next=${encodeURIComponent(next)}`} className="font-semibold text-accent hover:underline">
          {t.auth.toLogin}
        </Link>
      </p>
    </form>
  );
}
