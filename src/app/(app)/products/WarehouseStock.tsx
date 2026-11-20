"use client";

import clsx from "clsx";
import { Check, Search } from "lucide-react";
import { useState } from "react";
import { useI18n } from "@/i18n/client";
import { api } from "@/lib/apiClient";

type Row = { id: string; name: string; category: string; unit: string; stock: number; minOrder: number };

/** Omborchi: mahsulotlar qoldig'ini yangilash (narxsiz). Har qator alohida saqlanadi. */
export function WarehouseStock({ products }: { products: Row[] }) {
  const { t } = useI18n();
  const [q, setQ] = useState("");
  const shown = products.filter((p) => p.name.toLowerCase().includes(q.trim().toLowerCase()));
  return (
    <div className="flex flex-col gap-3">
      <label className="flex h-10 items-center gap-2 rounded-xl border border-line bg-surface px-3 text-muted focus-within:border-accent sm:w-80">
        <Search size={16} aria-hidden />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t.header.searchProducts} aria-label={t.header.searchProducts} className="min-w-0 flex-1 bg-transparent text-text outline-none" />
      </label>
      <ul className="glass-card flex flex-col divide-y divide-line rounded-2xl">
        {shown.map((p) => (
          <StockRow key={p.id} row={p} />
        ))}
      </ul>
    </div>
  );
}

function StockRow({ row }: { row: Row }) {
  const { t } = useI18n();
  const units = t.units as Record<string, string>;
  const categories = t.categories as Record<string, string>;
  const [value, setValue] = useState(String(row.stock));
  const [saved, setSaved] = useState(row.stock);
  const [state, setState] = useState<"idle" | "saving" | "ok" | "error">("idle");
  const n = Math.max(0, Math.floor(Number(value)) || 0);
  const low = saved < row.minOrder;

  async function save() {
    setState("saving");
    const res = await api(`/api/v1/products/${row.id}/stock`, { method: "PATCH", body: { stock: n } });
    if (res.ok) {
      setSaved(n);
      setState("ok");
    } else setState("error");
  }

  return (
    <li className="flex flex-wrap items-center gap-3 px-4 py-3">
      <span className="min-w-0 flex-1">
        <span className="block font-semibold">{row.name}</span>
        <span className="text-[12px] text-muted">
          {categories[row.category] ?? row.category} · {t.products.minOrder}: {row.minOrder} {units[row.unit] ?? row.unit}
        </span>
      </span>
      <span className={clsx("text-[13px] tabular-nums", low ? "font-semibold text-danger" : "text-muted")}>
        {t.products.stock}: {saved}
      </span>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void save();
        }}
        className="flex items-center gap-2"
      >
        <input
          type="number"
          inputMode="numeric"
          min={0}
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            setState("idle");
          }}
          aria-label={`${row.name} — ${t.products.stock}`}
          className="h-9 w-24 rounded-lg border border-line bg-surface text-center tabular-nums outline-none focus:border-accent"
        />
        <span className="w-10 text-[12px] text-muted">{units[row.unit] ?? row.unit}</span>
        <button
          type="submit"
          disabled={state === "saving" || n === saved}
          className="inline-flex h-9 cursor-pointer items-center gap-1 rounded-lg border border-line bg-surface px-3 text-[13px] font-semibold hover:border-accent/40 hover:text-accent disabled:cursor-default disabled:opacity-50"
        >
          {state === "ok" && n === saved ? <Check size={15} className="text-success" aria-label={t.products.saved} /> : t.products.save}
        </button>
      </form>
      {state === "error" && <span className="basis-full text-[12px] text-danger">{t.errors.SERVER_ERROR}</span>}
    </li>
  );
}
