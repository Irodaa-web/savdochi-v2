"use client";

import { Plus, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { SelectField, TextField } from "@/components/ui/Field";
import { useI18n } from "@/i18n/client";
import { api } from "@/lib/apiClient";
import { CATEGORY_CODES, UNIT_CODES } from "@/lib/catalog";
import type { ProductView } from "@/server/products";

type Tier = { min: string; price: string };

function errorText(errors: Record<string, string>, code: string | undefined): string | undefined {
  if (!code) return undefined;
  return errors[code] ?? errors.INVALID_INPUT;
}

export function ProductForm({ product }: { product?: ProductView }) {
  const { t } = useI18n();
  const router = useRouter();
  const errors = t.errors as Record<string, string>;
  const [form, setForm] = useState({
    name: product?.name ?? "",
    category: product?.category ?? "",
    unit: product?.unit ?? "",
    price: product ? String(product.price) : "",
    minOrder: product ? String(product.minOrder) : "1",
    stock: product ? String(product.stock) : "",
    packSize: product ? String(product.packSize) : "1",
    description: product?.description ?? "",
  });
  const [tiers, setTiers] = useState<Tier[]>(product?.priceTiers.map((x) => ({ min: String(x.min), price: String(x.price) })) ?? []);
  const [fields, setFields] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const set = (key: keyof typeof form) => (e: { target: { value: string } }) => setForm((f) => ({ ...f, [key]: e.target.value }));
  const setTier = (i: number, key: keyof Tier, value: string) => setTiers((all) => all.map((x, j) => (j === i ? { ...x, [key]: value } : x)));

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setFields({});
    const body = { ...form, priceTiers: tiers.filter((x) => x.min && x.price) };
    const res = product
      ? await api(`/api/v1/products/${product.id}`, { method: "PATCH", body })
      : await api("/api/v1/products", { method: "POST", body });
    if (res.ok) {
      router.push("/products");
      router.refresh();
      return;
    }
    setSaving(false);
    if (res.fields) setFields(res.fields);
    else setError(errorText(errors, res.error) ?? errors.SERVER_ERROR!);
  }

  const num = { type: "number", inputMode: "numeric" as const, min: 0, step: 1 };

  return (
    <form onSubmit={onSubmit} noValidate className="flex max-w-3xl flex-col gap-5">
      {error && <Alert>{error}</Alert>}

      <section className="grid gap-4 rounded-xl border border-line bg-surface p-5 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <TextField label={t.products.name} placeholder={t.products.namePlaceholder} value={form.name} onChange={set("name")} error={errorText(errors, fields.name)} required />
        </div>
        <SelectField
          label={t.products.category}
          value={form.category}
          onChange={set("category")}
          placeholder={t.products.category}
          options={CATEGORY_CODES.map((c) => ({ value: c, label: t.categories[c] }))}
          error={errorText(errors, fields.category)}
        />
        <SelectField
          label={t.products.unit}
          value={form.unit}
          onChange={set("unit")}
          placeholder={t.products.unit}
          options={UNIT_CODES.map((u) => ({ value: u, label: t.units[u] }))}
          error={errorText(errors, fields.unit)}
        />
        <TextField label={t.products.price} {...num} value={form.price} onChange={set("price")} error={errorText(errors, fields.price)} required />
        <TextField label={t.products.minOrder} {...num} value={form.minOrder} onChange={set("minOrder")} error={errorText(errors, fields.minOrder)} />
        <TextField label={t.products.stock} {...num} value={form.stock} onChange={set("stock")} error={errorText(errors, fields.stock)} required />
        <TextField label={t.products.packSize} hint={t.products.packSizeHint} {...num} value={form.packSize} onChange={set("packSize")} error={errorText(errors, fields.packSize)} />
        <div className="flex flex-col gap-1.5 sm:col-span-2">
          <label htmlFor="description" className="text-[13px] font-medium">
            {t.products.description}
          </label>
          <textarea
            id="description"
            rows={4}
            maxLength={2000}
            value={form.description}
            onChange={set("description")}
            placeholder={t.products.descriptionHint}
            className="rounded-lg border border-line bg-surface px-3 py-2.5 text-[15px] outline-none focus:border-accent"
          />
        </div>
      </section>

      <section className="flex flex-col gap-3 rounded-xl border border-line bg-surface p-5">
        <div>
          <h2 className="font-semibold">{t.products.tiers}</h2>
          <p className="mt-1 text-[13px] text-muted">{t.products.tiersHint}</p>
        </div>
        {fields.priceTiers && <Alert>{errorText(errors, fields.priceTiers)}</Alert>}
        {tiers.map((tier, i) => (
          <div key={i} className="grid grid-cols-[1fr_1fr_auto] items-end gap-3">
            <TextField label={t.products.tierMin} {...num} min={2} value={tier.min} onChange={(e) => setTier(i, "min", e.target.value)} />
            <TextField label={t.products.tierPrice} {...num} min={1} value={tier.price} onChange={(e) => setTier(i, "price", e.target.value)} />
            <button
              type="button"
              onClick={() => setTiers((all) => all.filter((_, j) => j !== i))}
              aria-label={t.products.removeTier}
              className="flex size-11 cursor-pointer items-center justify-center rounded-lg border border-line text-muted hover:text-danger"
            >
              <X size={16} aria-hidden />
            </button>
          </div>
        ))}
        {tiers.length < 5 && (
          <button type="button" onClick={() => setTiers((all) => [...all, { min: "", price: "" }])} className="flex w-fit cursor-pointer items-center gap-1.5 text-[13px] font-semibold text-accent hover:underline">
            <Plus size={15} aria-hidden />
            {t.products.addTier}
          </button>
        )}
      </section>

      <div className="flex gap-3">
        <Button type="submit" loading={saving}>
          {t.products.save}
        </Button>
        <Link href="/products" className="inline-flex h-10 items-center rounded-lg px-4 font-semibold hover:bg-surface-2">
          {t.products.cancel}
        </Link>
      </div>
    </form>
  );
}
