"use client";

import { useRouter } from "next/navigation";
import { useI18n } from "@/i18n/client";
import { REGION_CODES } from "@/lib/regions";

export function RegionFilter({ value }: { value: string }) {
  const { t } = useI18n();
  const router = useRouter();
  return (
    <select
      aria-label={t.auth.region}
      value={value}
      onChange={(e) => router.push(e.target.value ? `/suppliers?region=${e.target.value}` : "/suppliers")}
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
