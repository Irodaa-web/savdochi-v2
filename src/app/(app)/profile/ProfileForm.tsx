"use client";

import clsx from "clsx";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { LocationField, type Point } from "@/components/orders/LocationField";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { SelectField, TextField } from "@/components/ui/Field";
import { useI18n } from "@/i18n/client";
import { api } from "@/lib/apiClient";
import { PAYMENT_METHODS, type PaymentMethod } from "@/lib/orders";
import { REGION_CODES, type RegionCode } from "@/lib/regions";
import type { ProfileView } from "@/server/profile";

function Chips<T extends string | number>({ label, options, value, onChange }: { label: string; options: { value: T; label: string }[]; value: T[]; onChange: (v: T[]) => void }) {
  return (
    <fieldset className="flex flex-col gap-1.5">
      <legend className="mb-1.5 text-[13px] font-medium">{label}</legend>
      <div className="flex flex-wrap gap-1.5">
        {options.map((o) => {
          const on = value.includes(o.value);
          return (
            <button
              key={String(o.value)}
              type="button"
              aria-pressed={on}
              onClick={() => onChange(on ? value.filter((v) => v !== o.value) : [...value, o.value])}
              className={clsx("cursor-pointer rounded-full border px-3 py-1.5 text-[13px] font-medium", on ? "border-accent bg-accent text-accent-fg" : "border-line bg-surface hover:bg-surface-2")}
            >
              {o.label}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}

export function ProfileForm({ profile }: { profile: ProfileView }) {
  const { t } = useI18n();
  const router = useRouter();
  const errors = t.errors as Record<string, string>;
  const p = profile.profile;
  const isSeller = profile.role === "seller";
  const [form, setForm] = useState({
    name: profile.name,
    region: profile.region as string,
    about: p.about,
    address: p.address,
    leadDays: String(p.leadDays),
    deliveryFee: String(p.deliveryFee),
    minOrderTotal: String(p.minOrderTotal),
  });
  const [regions, setRegions] = useState<RegionCode[]>(p.deliveryRegions);
  const [days, setDays] = useState<number[]>(p.deliveryDays);
  const [methods, setMethods] = useState<PaymentMethod[]>(p.paymentMethods);
  const [point, setPoint] = useState<Point>(p.lat != null && p.lng != null ? { lat: p.lat, lng: p.lng } : null);
  const [fields, setFields] = useState<Record<string, string>>({});
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const set = (k: keyof typeof form) => (e: { target: { value: string } }) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const fe = (k: string) => (fields[k] ? (errors[fields[k]] ?? errors.INVALID_INPUT) : undefined);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setStatus("saving");
    setFields({});
    const res = await api("/api/v1/profile", {
      method: "PUT",
      body: { ...form, deliveryRegions: regions, deliveryDays: days.sort(), paymentMethods: methods.length ? methods : ["cash"], lat: point?.lat ?? null, lng: point?.lng ?? null },
    });
    if (!res.ok) {
      if (res.fields) setFields(res.fields);
      return setStatus("error");
    }
    setStatus("saved");
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-5" noValidate>
      <section className="grid gap-4 rounded-xl border border-line bg-surface p-5 sm:grid-cols-2">
        <h2 className="font-semibold sm:col-span-2">{t.profile.main}</h2>
        <TextField label={t.auth.name} value={form.name} onChange={set("name")} error={fe("name")} required />
        <SelectField label={t.auth.region} value={form.region} onChange={set("region")} error={fe("region")} options={REGION_CODES.map((r) => ({ value: r, label: t.regions[r] }))} />
        <div className="sm:col-span-2">
          <TextField label={t.checkout.address} value={form.address} onChange={set("address")} placeholder={t.checkout.addressPlaceholder} />
        </div>
        <div className="sm:col-span-2">
          <TextField label={t.profile.about} value={form.about} onChange={set("about")} maxLength={1000} placeholder={isSeller ? t.profile.aboutSeller : t.profile.aboutBuyer} />
        </div>
        {!isSeller && (
          <div className="sm:col-span-2">
            <LocationField value={point} onChange={setPoint} />
          </div>
        )}
      </section>

      {isSeller && (
        <section className="flex flex-col gap-4 rounded-xl border border-line bg-surface p-5">
          <h2 className="font-semibold">{t.profile.delivery}</h2>
          <p className="-mt-2 text-[13px] text-muted">{t.profile.deliveryHint}</p>
          <Chips label={t.profile.deliveryRegions} options={REGION_CODES.map((r) => ({ value: r, label: t.regions[r] }))} value={regions} onChange={setRegions} />
          <Chips label={t.profile.deliveryDays} options={t.weekdays.map((d, i) => ({ value: i + 1, label: d }))} value={days} onChange={setDays} />
          <div className="grid gap-4 sm:grid-cols-3">
            <TextField label={t.profile.leadDays} type="number" min={0} max={60} value={form.leadDays} onChange={set("leadDays")} error={fe("leadDays")} />
            <TextField label={t.profile.deliveryFee} type="number" min={0} value={form.deliveryFee} onChange={set("deliveryFee")} error={fe("deliveryFee")} />
            <TextField label={t.profile.minOrderTotal} type="number" min={0} value={form.minOrderTotal} onChange={set("minOrderTotal")} error={fe("minOrderTotal")} />
          </div>
          <Chips label={t.profile.paymentMethods} options={PAYMENT_METHODS.map((m) => ({ value: m, label: t.payment[m] }))} value={methods} onChange={setMethods} />
        </section>
      )}

      {status === "error" && <Alert>{errors.INVALID_INPUT}</Alert>}
      {status === "saved" && <Alert tone="success">{t.products.saved}</Alert>}
      <Button type="submit" loading={status === "saving"} className="w-fit">
        {t.products.save}
      </Button>
    </form>
  );
}
