"use client";

import { useRouter } from "next/navigation";
import { useI18n } from "@/i18n/client";
import { REGION_CODES } from "@/lib/regions";

/** Viloyat filtri. Qidiruv so'zi (q) saqlanib qoladi. */
export function RegionFilter({ value, q }: { value: string; q?: string }) {
  const { t } = useI18n();
  const router = useRouter();
  return (
    <select
      aria-label={t.auth.region}
      value={value}
      onChange={(e) => {
        const params = new URLSearchParams();
        if (q) params.set("q", q);
        if (e.target.value) params.set("region", e.target.value);
        const s = params.toString();
        router.push(s ? `/suppliers?${s}` : "/suppliers");
      }}
      className="h-10 cursor-pointer rounded-lg border border-line bg-surface px-3 outline-none focus:border-accent"
    >
      <option value="">{t.suppliers.allRegions}</option>
      {REGION_CODES.map((code) => (
        <option key={code} value={code}>
          {t.regions[code]}
        </option>
      ))}
    </select>
  );
}
