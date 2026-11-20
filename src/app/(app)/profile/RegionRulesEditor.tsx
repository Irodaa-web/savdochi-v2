"use client";

import clsx from "clsx";
import { MapPinned, Plus, X } from "lucide-react";
import { SelectField, TextField } from "@/components/ui/Field";
import { fmt, useI18n } from "@/i18n/client";
import { formatAmount } from "@/lib/catalog";
import { REGION_CODES, type RegionCode } from "@/lib/regions";

export type RuleDraft = { region: RegionCode; days: number[]; fee: string; minOrderTotal: string };

/**
 * Viloyatlar bo'yicha yetkazish jadvali: har viloyatga alohida kunlar, narx va minimal summa.
 * Bo'sh qoldirilgan maydon — umumiy sozlama amal qiladi.
 */
export function RegionRulesEditor({ value, onChange, base }: { value: RuleDraft[]; onChange: (v: RuleDraft[]) => void; base: { days: number[]; fee: string; minOrderTotal: string } }) {
  const { t } = useI18n();
  const used = new Set(value.map((r) => r.region));
  const free = REGION_CODES.filter((r) => !used.has(r));
  const patch = (i: number, p: Partial<RuleDraft>) => onChange(value.map((r, j) => (j === i ? { ...r, ...p } : r)));
  const general = (v: string) => fmt(t.delivery.general, { value: Number(v) ? `${formatAmount(Number(v))} ${t.common.sum}` : t.supplierPage.free });

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-line bg-surface-2/40 p-4">
      <div className="flex items-start gap-2.5">
        <MapPinned size={18} className="mt-0.5 shrink-0 text-accent" aria-hidden />
        <div>
          <h3 className="text-[14px] font-semibold">{t.delivery.rulesTitle}</h3>
          <p className="text-[13px] text-muted">{t.delivery.rulesHint}</p>
        </div>
      </div>
      {value.map((rule, i) => (
        <div key={rule.region} className="flex flex-col gap-3 rounded-xl border border-line bg-surface p-3">
          <div className="flex items-end gap-2">
            <div className="min-w-0 flex-1">
              <SelectField
                label={t.auth.region}
                value={rule.region}
                onChange={(e) => patch(i, { region: e.target.value as RegionCode })}
                options={[rule.region, ...free].map((r) => ({ value: r, label: t.regions[r] }))}
              />
            </div>
            <button
              type="button"
              onClick={() => onChange(value.filter((_, j) => j !== i))}
              aria-label={fmt(t.delivery.removeRule, { region: t.regions[rule.region] })}
              title={fmt(t.delivery.removeRule, { region: t.regions[rule.region] })}
              className="flex size-11 shrink-0 cursor-pointer items-center justify-center rounded-lg border border-line text-muted hover:text-danger"
            >
              <X size={16} aria-hidden />
            </button>
          </div>
          <fieldset className="flex flex-col gap-1.5">
            <legend className="mb-1.5 text-[13px] font-medium">
              {t.profile.deliveryDays} <span className="font-normal text-muted">· {rule.days.length ? "" : fmt(t.delivery.general, { value: base.days.map((d) => t.weekdays[d - 1]).join(", ") || "—" })}</span>
            </legend>
            <div className="flex flex-wrap gap-1.5">
              {t.weekdays.map((d, k) => {
                const on = rule.days.includes(k + 1);
                return (
                  <button
                    key={d}
                    type="button"
                    aria-pressed={on}
                    onClick={() => patch(i, { days: on ? rule.days.filter((x) => x !== k + 1) : [...rule.days, k + 1].sort() })}
                    className={clsx("cursor-pointer rounded-full border px-3 py-1.5 text-[13px] font-medium", on ? "border-accent bg-accent text-accent-fg" : "border-line bg-surface hover:bg-surface-2")}
                  >
                    {d}
                  </button>
                );
              })}
            </div>
          </fieldset>
          <div className="grid gap-3 sm:grid-cols-2">
            <TextField label={t.profile.deliveryFee} type="number" min={0} value={rule.fee} onChange={(e) => patch(i, { fee: e.target.value })} placeholder={general(base.fee)} />
            <TextField label={t.profile.minOrderTotal} type="number" min={0} value={rule.minOrderTotal} onChange={(e) => patch(i, { minOrderTotal: e.target.value })} placeholder={general(base.minOrderTotal)} />
          </div>
        </div>
      ))}
      {free.length > 0 && (
        <button
          type="button"
          onClick={() => onChange([...value, { region: free[0]!, days: [], fee: "", minOrderTotal: "" }])}
          className="flex w-fit cursor-pointer items-center gap-1.5 text-[13px] font-semibold text-accent hover:underline"
        >
          <Plus size={15} aria-hidden />
          {t.delivery.addRule}
        </button>
      )}
    </div>
  );
}
